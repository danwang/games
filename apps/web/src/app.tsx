import { useEffect, useRef, useState } from 'react';

import {
  type ActiveRoomSnapshot,
  type GameConfigField,
  type LobbySnapshot,
  type PlayerIdentity,
  type RoomId,
  type RoomSnapshot,
  type SerializedValue,
  type ServerMessage,
} from '@games/game-sdk';
import { registeredGames } from '@games/game-registry';

import { GameRoomScreen } from './game-room-screen.js';
import { LobbyScreen } from './lobby-screen.js';
import { LobbyShell } from './lobby-shell.js';
import { PageBackdrop } from './page-backdrop.js';
import { PlayerAuthScreen } from './player-auth-screen.js';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

const lobbyEmptyState: LobbySnapshot = {
  rooms: [],
};

const playerStorageKey = 'games-platform:player';
const roomPathPattern = /^\/rooms\/([A-Za-z]{1,6})\/?$/;

const getRoomIdFromLocation = (pathname: string = window.location.pathname): RoomId | null => {
  const match = pathname.match(roomPathPattern);

  if (!match) {
    return null;
  }

  const roomId = match[1];

  if (!roomId) {
    return null;
  }

  return roomId.toUpperCase();
};

const getPathForRoom = (roomId: RoomId | null): string => {
  return roomId ? `/rooms/${roomId}` : '/';
};

const getServerUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_SERVER_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${protocol}://127.0.0.1:3001`;
  }

  return `${protocol}://${window.location.host}`;
};

const createPlayerIdentity = (displayName: string, existingPlayerId?: string): PlayerIdentity => {
  const normalizedName = displayName.trim();
  const suffix = crypto.randomUUID().slice(0, 8);

  return {
    playerId: existingPlayerId ?? `player-${suffix}`,
    displayName: normalizedName.length > 0 ? normalizedName : `Player ${suffix}`,
  };
};

const createDemoPlayer = (): PlayerIdentity => {
  const suffix = crypto.randomUUID().slice(0, 8);

  return {
    playerId: `player-${suffix}`,
    displayName: `Player ${suffix}`,
  };
};

const loadPlayer = (): PlayerIdentity | null => {
  const storedValue = window.localStorage.getItem(playerStorageKey);

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as PlayerIdentity;

    if (typeof parsed.playerId === 'string' && typeof parsed.displayName === 'string') {
      return parsed;
    }
  } catch {
    // Fall through to regenerate a local demo identity.
  }

  return null;
};

export const App = () => {
  const [player, setPlayer] = useState<PlayerIdentity | null>(() => loadPlayer());
  const [playerNameInput, setPlayerNameInput] = useState(() => loadPlayer()?.displayName ?? '');
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    player ? 'connecting' : 'disconnected',
  );
  const [lobby, setLobby] = useState<LobbySnapshot>(lobbyEmptyState);
  const [isLobbyReady, setIsLobbyReady] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<RoomSnapshot | null>(null);
  const [currentRoomHistory, setCurrentRoomHistory] = useState<readonly ActiveRoomSnapshot[]>([]);
  const [desiredRoomId, setDesiredRoomId] = useState<RoomId | null>(() => getRoomIdFromLocation());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const desiredRoomIdRef = useRef<RoomId | null>(null);
  const playerRef = useRef(player);
  const currentRoomRef = useRef<RoomSnapshot | null>(currentRoom);
  const availableGames = registeredGames.map(({ definition }) => ({
    id: definition.id,
    displayName: definition.displayName,
    description: definition.description,
    defaultConfig: definition.serializeConfig(definition.defaultConfig),
    configFields: definition.configFields as readonly GameConfigField[],
  }));

  useEffect(() => {
    desiredRoomIdRef.current = desiredRoomId;
  }, [desiredRoomId]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoomId = getRoomIdFromLocation();
      const previousRoomId = desiredRoomIdRef.current;

      if (previousRoomId === nextRoomId) {
        return;
      }

      if (previousRoomId && socketRef.current?.readyState === WebSocket.OPEN) {
        if (currentRoomRef.current?.status === 'waiting') {
          socketRef.current.send(
            JSON.stringify({
              type: 'leave-room',
              roomId: previousRoomId,
            }),
          );
        }
      }

      setDesiredRoomId(nextRoomId);
      setCurrentRoom(null);
      setCurrentRoomHistory([]);
      setErrorMessage(null);

      if (nextRoomId && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'join-room',
            roomId: nextRoomId,
          }),
        );
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!player) {
      setConnectionState('disconnected');
      setIsLobbyReady(false);
      return;
    }

    let cancelled = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnectTimer();
      setConnectionState('connecting');
      setIsLobbyReady(false);

      const socket = new WebSocket(getServerUrl());
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (cancelled) {
          socket.close();
          return;
        }

        setConnectionState('connected');
        setErrorMessage(null);
        if (!playerRef.current) {
          return;
        }

        socket.send(JSON.stringify({ type: 'identify', player: playerRef.current }));
        socket.send(JSON.stringify({ type: 'subscribe-lobby' }));

        if (desiredRoomIdRef.current) {
          socket.send(
            JSON.stringify({
              type: 'join-room',
              roomId: desiredRoomIdRef.current,
            }),
          );
        }
      });

      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data) as ServerMessage;

        switch (message.type) {
          case 'lobby-snapshot':
            setLobby(message.lobby);
            setIsLobbyReady(true);
            return;
          case 'room-created':
            setDesiredRoomId(message.roomId);
            window.history.pushState(null, '', getPathForRoom(message.roomId));
            return;
          case 'room-snapshot':
            setCurrentRoom(message.room);
            setDesiredRoomId(message.room.id);
            setCurrentRoomHistory((currentHistory) => {
              if (message.room.status === 'waiting') {
                return [];
              }

              const historyRoomIds = new Set(currentHistory.map((entry) => entry.id));
              const nextHistory =
                historyRoomIds.size > 0 && !historyRoomIds.has(message.room.id) ? [] : [...currentHistory];
              const filteredHistory = nextHistory.filter((entry) => entry.id === message.room.id);
              const existingEntryIndex = filteredHistory.findIndex(
                (entry) => entry.stateVersion === message.room.stateVersion,
              );

              if (existingEntryIndex >= 0) {
                const updatedHistory = [...filteredHistory];
                updatedHistory[existingEntryIndex] = message.room;
                return updatedHistory.sort((left, right) => left.stateVersion - right.stateVersion);
              }

              return [...filteredHistory, message.room].sort(
                (left, right) => left.stateVersion - right.stateVersion,
              );
            });
            return;
          case 'error':
            setErrorMessage(message.error.message);

            if (desiredRoomIdRef.current && message.error.message.includes('Unknown room')) {
              setDesiredRoomId(null);
              setCurrentRoom(null);
            }
            return;
        }
      });

      socket.addEventListener('close', () => {
        if (cancelled) {
          return;
        }

        setConnectionState('disconnected');
        setIsLobbyReady(false);
        reconnectTimerRef.current = window.setTimeout(connect, 1000);
      });
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [player]);

  const sendMessage = (message: object): void => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setErrorMessage('The realtime connection is not ready yet.');
      return;
    }

    socketRef.current.send(JSON.stringify(message));
  };

  const createRoom = (gameId: string, config: SerializedValue): void => {
    setErrorMessage(null);
    sendMessage({
      type: 'create-room',
      gameId,
      config,
    });
  };

  const joinRoom = (roomId: RoomId): void => {
    setErrorMessage(null);
    setDesiredRoomId(roomId);
    window.history.pushState(null, '', getPathForRoom(roomId));
    sendMessage({
      type: 'join-room',
      roomId,
    });
  };

  const leaveRoom = (): void => {
    const roomId = desiredRoomIdRef.current;
    const shouldLeaveSeat = currentRoomRef.current?.status === 'waiting';

    setDesiredRoomId(null);
    setCurrentRoom(null);
    setCurrentRoomHistory([]);
    window.history.pushState(null, '', getPathForRoom(null));

    if (!roomId || !shouldLeaveSeat) {
      return;
    }

    sendMessage({
      type: 'leave-room',
      roomId,
    });
  };

  const startRoom = (): void => {
    if (!currentRoom) {
      return;
    }

    setErrorMessage(null);
    sendMessage({
      type: 'start-room',
      roomId: currentRoom.id,
    });
  };

  const submitMove = (move: SerializedValue): void => {
    if (!currentRoom) {
      return;
    }

    setErrorMessage(null);
    sendMessage({
      type: 'submit-move',
      roomId: currentRoom.id,
      stateVersion: currentRoom.stateVersion,
      move,
    });
  };

  const signIn = (): void => {
    const normalizedName = playerNameInput.trim();

    if (normalizedName.length === 0) {
      return;
    }

    const nextPlayer = createPlayerIdentity(normalizedName, player?.playerId);
    window.localStorage.setItem(playerStorageKey, JSON.stringify(nextPlayer));
    setPlayer(nextPlayer);
  };

  useEffect(() => {
    const nextPath = getPathForRoom(desiredRoomId);

    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, '', nextPath);
    }
  }, [desiredRoomId]);

  if (!player) {
    return (
      <PageBackdrop>
        <PlayerAuthScreen
          defaultName={playerNameInput}
          isSubmitting={false}
          onNameChange={setPlayerNameInput}
          onSubmit={signIn}
        />
      </PageBackdrop>
    );
  }

  if (currentRoom && currentRoom.status !== 'waiting') {
    return (
      <GameRoomScreen
        roomHistory={currentRoomHistory}
        leaveRoom={leaveRoom}
        playerId={player.playerId}
        room={currentRoom}
        startRoom={startRoom}
        submitMove={submitMove}
      />
    );
  }

  const activeRoomId = currentRoom ? currentRoom.id : desiredRoomId;

  return (
    <LobbyShell
      connectionState={connectionState}
      errorMessage={errorMessage}
      playerName={player.displayName}
    >
      {currentRoom ? (
        <GameRoomScreen
          roomHistory={currentRoomHistory}
          leaveRoom={leaveRoom}
          playerId={player.playerId}
          room={currentRoom}
          startRoom={startRoom}
          submitMove={submitMove}
        />
      ) : (
        <LobbyScreen
          availableGames={availableGames}
          createRoom={createRoom}
          currentRoomId={activeRoomId}
          isLobbyReady={isLobbyReady}
          joinRoom={joinRoom}
          lobby={lobby}
          playerName={player.displayName}
        />
      )}
    </LobbyShell>
  );
};
