import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WebSocket, WebSocketServer, type RawData } from 'ws';

import {
  type ClientMessage,
  type GameError,
  type PlayerIdentity,
  type RoomId,
  type ServerMessage,
} from '@games/game-sdk';

import { createRoomService } from './room-service.js';

const port = Number(process.env.PORT ?? '3001');
const serverRoot = fileURLToPath(new URL('.', import.meta.url));
const webDistRoot = path.resolve(serverRoot, '../../web/dist');
const roomService = createRoomService();
const lobbySubscribers = new Set<WebSocket>();
const roomSubscribers = new Map<RoomId, Set<WebSocket>>();
const socketPlayers = new Map<WebSocket, PlayerIdentity>();
const socketRooms = new Map<WebSocket, RoomId>();

const sendMessage = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const broadcastLobbySnapshot = (): void => {
  const lobby = roomService.listRooms();

  lobbySubscribers.forEach((socket) => {
    sendMessage(socket, {
      type: 'lobby-snapshot',
      lobby,
    });
  });
};

const broadcastRoomSnapshot = (roomId: RoomId): void => {
  const room = roomService.getRoom(roomId);

  if (!room) {
    return;
  }

  roomSubscribers.get(roomId)?.forEach((socket) => {
    sendMessage(socket, {
      type: 'room-snapshot',
      room,
    });
  });
};

const sendError = (socket: WebSocket, error: unknown): void => {
  const payload: GameError = {
    code: 'server-error',
    message: error instanceof Error ? error.message : 'An unexpected server error occurred.',
  };

  sendMessage(socket, {
    type: 'error',
    error: payload,
  });
};

const requirePlayer = (socket: WebSocket): PlayerIdentity => {
  const player = socketPlayers.get(socket);

  if (!player) {
    throw new Error('Client must identify before sending lobby or room messages.');
  }

  return player;
};

const subscribeRoom = (socket: WebSocket, roomId: RoomId): void => {
  const currentRoomId = socketRooms.get(socket);

  if (currentRoomId && currentRoomId !== roomId) {
    roomSubscribers.get(currentRoomId)?.delete(socket);
  }

  const subscribers = roomSubscribers.get(roomId) ?? new Set<WebSocket>();
  subscribers.add(socket);
  roomSubscribers.set(roomId, subscribers);
  socketRooms.set(socket, roomId);
};

const unsubscribeRoom = (socket: WebSocket): RoomId | null => {
  const roomId = socketRooms.get(socket);

  if (!roomId) {
    return null;
  }

  roomSubscribers.get(roomId)?.delete(socket);

  if (roomSubscribers.get(roomId)?.size === 0) {
    roomSubscribers.delete(roomId);
  }

  socketRooms.delete(socket);

  return roomId;
};

const server = createServer((_request, response) => {
  const requestUrl = _request.url ?? '/';
  const pathname = requestUrl.split('?')[0] ?? '/';

  if (pathname === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  const contentTypeForPath = (filePath: string): string => {
    const extension = path.extname(filePath);

    switch (extension) {
      case '.html':
        return 'text/html; charset=utf-8';
      case '.js':
        return 'text/javascript; charset=utf-8';
      case '.css':
        return 'text/css; charset=utf-8';
      case '.json':
        return 'application/json; charset=utf-8';
      case '.svg':
        return 'image/svg+xml';
      case '.png':
        return 'image/png';
      case '.woff2':
        return 'font/woff2';
      default:
        return 'application/octet-stream';
    }
  };

  const serveFile = async (relativePath: string, statusCode = 200): Promise<boolean> => {
    const normalizedPath = relativePath.replace(/^\/+/, '');
    const absolutePath = path.resolve(webDistRoot, normalizedPath);

    if (!absolutePath.startsWith(webDistRoot)) {
      return false;
    }

    try {
      const body = await readFile(absolutePath);
      response.writeHead(statusCode, { 'content-type': contentTypeForPath(absolutePath) });
      response.end(body);
      return true;
    } catch {
      return false;
    }
  };

  void (async () => {
    if (pathname === '/') {
      if (await serveFile('index.html')) {
        return;
      }
    }

    if (pathname !== '/' && !pathname.endsWith('/')) {
      if (await serveFile(pathname)) {
        return;
      }
    }

    if (await serveFile('index.html')) {
      return;
    }

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  })();
});

const websocketServer = new WebSocketServer({ server });

websocketServer.on('connection', (socket) => {
  socket.on('message', (rawData: RawData) => {
    try {
      const message = JSON.parse(rawData.toString()) as ClientMessage;

      switch (message.type) {
        case 'identify':
          socketPlayers.set(socket, message.player);
          return;
        case 'subscribe-lobby':
          requirePlayer(socket);
          lobbySubscribers.add(socket);
          broadcastLobbySnapshot();
          return;
        case 'unsubscribe-lobby':
          lobbySubscribers.delete(socket);
          return;
        case 'create-room': {
          const player = requirePlayer(socket);
          const room = roomService.createRoom({
            gameId: message.gameId,
            config: message.config,
            owner: player,
          });

          subscribeRoom(socket, room.id);
          sendMessage(socket, {
            type: 'room-created',
            roomId: room.id,
          });
          sendMessage(socket, {
            type: 'room-snapshot',
            room,
          });
          broadcastLobbySnapshot();
          return;
        }
        case 'join-room': {
          const player = requirePlayer(socket);
          const room = roomService.joinRoom(message.roomId, player);

          subscribeRoom(socket, room.id);
          sendMessage(socket, {
            type: 'room-snapshot',
            room,
          });
          broadcastRoomSnapshot(room.id);
          broadcastLobbySnapshot();
          return;
        }
        case 'start-room': {
          const player = requirePlayer(socket);
          const room = roomService.startRoom(message.roomId, player.playerId);

          subscribeRoom(socket, room.id);
          broadcastRoomSnapshot(room.id);
          broadcastLobbySnapshot();
          return;
        }
        case 'leave-room': {
          const player = requirePlayer(socket);
          const roomId = message.roomId;

          unsubscribeRoom(socket);
          roomService.leaveRoom(roomId, player.playerId);
          broadcastRoomSnapshot(roomId);
          broadcastLobbySnapshot();
          return;
        }
        case 'submit-move': {
          const player = requirePlayer(socket);
          const room = roomService.submitMove(
            message.roomId,
            player.playerId,
            message.stateVersion,
            message.move,
          );

          broadcastRoomSnapshot(room.id);
          broadcastLobbySnapshot();
          return;
        }
      }
    } catch (error) {
      sendError(socket, error);
    }
  });

  socket.on('close', () => {
    lobbySubscribers.delete(socket);
    unsubscribeRoom(socket);
    socketPlayers.delete(socket);
  });
});

server.listen(port, () => {
  console.log(`Games server listening on http://localhost:${port}`);
});
