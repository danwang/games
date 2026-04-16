import {
  type ActiveRoomSnapshot,
  type LobbySnapshot,
  type PlayerIdentity,
  type RoomId,
  type RoomSnapshot,
  type SerializedValue,
  type WaitingRoomSnapshot,
} from '@games/game-sdk';

import {
  applyMoveToRoomSnapshot,
  createRoomSnapshot,
  joinRoomSnapshot,
  leaveRoomSnapshot,
  startRoomSnapshot,
  toLobbyRoomSummary,
  type CreateRoomInput,
} from './room-domain.js';

interface RoomRecord {
  readonly room: RoomSnapshot;
}

export interface RoomService {
  readonly createRoom: (input: CreateRoomInput) => RoomSnapshot;
  readonly getRoom: (roomId: RoomId) => RoomSnapshot | null;
  readonly joinRoom: (roomId: RoomId, player: PlayerIdentity) => RoomSnapshot;
  readonly leaveRoom: (roomId: RoomId, playerId: string) => RoomSnapshot | null;
  readonly listRooms: () => LobbySnapshot;
  readonly startRoom: (roomId: RoomId, playerId: string) => RoomSnapshot;
  readonly submitMove: (
    roomId: RoomId,
    playerId: string,
    stateVersion: number,
    move: SerializedValue,
  ) => RoomSnapshot;
}

export const createRoomService = (): RoomService => {
  const rooms = new Map<RoomId, RoomRecord>();

  const createRoom = (input: CreateRoomInput): RoomSnapshot => {
    const room = createRoomSnapshot(input);

    rooms.set(room.id, { room });

    return room;
  };

  const getRoom = (roomId: RoomId): RoomSnapshot | null => {
    return rooms.get(roomId)?.room ?? null;
  };

  const joinRoom = (roomId: RoomId, player: PlayerIdentity): RoomSnapshot => {
    const record = rooms.get(roomId);

    if (!record) {
      throw new Error(`Unknown room: ${roomId}`);
    }

    if (record.room.status !== 'waiting') {
      throw new Error(`Room ${roomId} has already started.`);
    }

    const nextRoom = joinRoomSnapshot({
      room: record.room as WaitingRoomSnapshot,
      player,
    });

    rooms.set(roomId, { room: nextRoom });

    return nextRoom;
  };

  const leaveRoom = (roomId: RoomId, playerId: string): RoomSnapshot | null => {
    const record = rooms.get(roomId);

    if (!record) {
      throw new Error(`Unknown room: ${roomId}`);
    }

    if (record.room.status !== 'waiting') {
      throw new Error('Cannot leave a room after the game has started.');
    }

    const result = leaveRoomSnapshot(record.room as WaitingRoomSnapshot, playerId);

    if (result.deletedRoomId) {
      rooms.delete(result.deletedRoomId);
      return null;
    }

    if (!result.room) {
      return null;
    }

    rooms.set(roomId, { room: result.room });

    return result.room;
  };

  const listRooms = (): LobbySnapshot => ({
    rooms: [...rooms.values()].map(({ room }) => toLobbyRoomSummary(room)),
  });

  const startRoom = (roomId: RoomId, playerId: string): RoomSnapshot => {
    const record = rooms.get(roomId);

    if (!record) {
      throw new Error(`Unknown room: ${roomId}`);
    }

    if (record.room.status !== 'waiting') {
      throw new Error('Room has already started.');
    }

    const nextRoom = startRoomSnapshot({
      room: record.room as WaitingRoomSnapshot,
      playerId,
    });

    rooms.set(roomId, { room: nextRoom });

    return nextRoom;
  };

  const submitMove = (roomId: RoomId, playerId: string, stateVersion: number, move: SerializedValue): RoomSnapshot => {
    const record = rooms.get(roomId);

    if (!record) {
      throw new Error(`Unknown room: ${roomId}`);
    }

    if (record.room.status === 'waiting') {
      throw new Error(`Room ${roomId} has not started a game.`);
    }

    const nextRoom = applyMoveToRoomSnapshot({
      room: record.room as ActiveRoomSnapshot,
      playerId,
      stateVersion,
      move,
    });

    rooms.set(roomId, { room: nextRoom });

    return nextRoom;
  };

  return {
    createRoom,
    getRoom,
    joinRoom,
    leaveRoom,
    listRooms,
    startRoom,
    submitMove,
  };
};
