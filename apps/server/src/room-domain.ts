import { randomUUID } from 'node:crypto';

import { getGameDefinition } from '@games/game-registry';
import {
  type ActiveRoomSnapshot,
  type LobbyRoomSummary,
  type PlayerIdentity,
  type PlayerSeat,
  type RoomId,
  type RoomSnapshot,
  type SerializedValue,
  type WaitingRoomSnapshot,
} from '@games/game-sdk';

export interface CreateRoomInput {
  readonly gameId: string;
  readonly owner: PlayerIdentity;
  readonly config?: SerializedValue;
  readonly seed?: string;
}

export interface JoinRoomInput {
  readonly room: WaitingRoomSnapshot;
  readonly player: PlayerIdentity;
  readonly seed?: string;
}

export interface SubmitMoveInput {
  readonly room: ActiveRoomSnapshot;
  readonly playerId: string;
  readonly stateVersion: number;
  readonly move: SerializedValue;
}

export interface StartRoomInput {
  readonly room: WaitingRoomSnapshot;
  readonly playerId: string;
  readonly seed?: string;
}

export interface LeaveRoomResult {
  readonly deletedRoomId: RoomId | null;
  readonly room: RoomSnapshot | null;
}

const createSeat = (player: PlayerIdentity, index: number): PlayerSeat => ({
  id: `seat-${index + 1}`,
  playerId: player.playerId,
  displayName: player.displayName,
});

const getSeatCountForRoom = (room: RoomSnapshot): number => {
  const definition = getGameDefinition(room.gameId);

  if (!definition) {
    throw new Error(`Unknown game: ${room.gameId}`);
  }

  return definition.getSeatCount(definition.deserializeConfig(room.config));
};

export const toLobbyRoomSummary = (room: RoomSnapshot): LobbyRoomSummary => ({
  id: room.id,
  gameId: room.gameId,
  status: room.status,
  stateVersion: room.stateVersion,
  config: room.config,
  seatCount: getSeatCountForRoom(room),
  occupiedSeatCount: room.seats.length,
});

export const createRoomSnapshot = (input: CreateRoomInput): WaitingRoomSnapshot => {
  const definition = getGameDefinition(input.gameId);

  if (!definition) {
    throw new Error(`Unknown game: ${input.gameId}`);
  }

  const normalizedConfig = definition.normalizeConfig(input.config ?? definition.defaultConfig);
  const seatCount = definition.getSeatCount(normalizedConfig);

  if (seatCount < 1) {
    throw new Error(`Game ${input.gameId} must require at least one seat.`);
  }

  return {
    id: randomUUID(),
    gameId: definition.id,
    config: definition.serializeConfig(normalizedConfig),
    stateVersion: 0,
    seats: [createSeat(input.owner, 0)],
    state: null,
    status: 'waiting',
  };
};

export const joinRoomSnapshot = (input: JoinRoomInput): WaitingRoomSnapshot => {
  const definition = getGameDefinition(input.room.gameId);

  if (!definition) {
    throw new Error(`Unknown game: ${input.room.gameId}`);
  }

  const config = definition.deserializeConfig(input.room.config);
  const seatCount = definition.getSeatCount(config);
  const existingSeat = input.room.seats.find((seat) => seat.playerId === input.player.playerId);

  if (existingSeat) {
    return input.room;
  }

  if (input.room.seats.length >= seatCount) {
    throw new Error(`Room ${input.room.id} is full.`);
  }

  const seats = [...input.room.seats, createSeat(input.player, input.room.seats.length)];

  return {
    ...input.room,
    seats,
  };
};

export const startRoomSnapshot = (input: StartRoomInput): ActiveRoomSnapshot => {
  const definition = getGameDefinition(input.room.gameId);

  if (!definition) {
    throw new Error(`Unknown game: ${input.room.gameId}`);
  }

  const config = definition.deserializeConfig(input.room.config);
  const seatCount = definition.getSeatCount(config);
  const hostPlayerId = input.room.seats[0]?.playerId;

  if (hostPlayerId !== input.playerId) {
    throw new Error('Only the host can start the room.');
  }

  if (input.room.seats.length !== seatCount) {
    throw new Error(`Room ${input.room.id} needs ${seatCount} players to start.`);
  }

  definition.validateSeats(config, input.room.seats);
  const initialState = definition.createInitialState(
    config,
    input.room.seats,
    input.seed ?? randomUUID(),
  );

  return {
    ...input.room,
    stateVersion: 1,
    state: definition.serializeState(initialState),
    status: definition.getRoomStatus(initialState),
  };
};

export const applyMoveToRoomSnapshot = (input: SubmitMoveInput): RoomSnapshot => {
  if (input.room.stateVersion !== input.stateVersion) {
    throw new Error(`Room ${input.room.id} is at state version ${input.room.stateVersion}.`);
  }

  const definition = getGameDefinition(input.room.gameId);

  if (!definition) {
    throw new Error(`Unknown game: ${input.room.gameId}`);
  }

  const currentState = definition.deserializeState(input.room.state);
  const decodedMove = definition.deserializeMove(input.move);
  const result = definition.applyMove(currentState, input.playerId, decodedMove);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return {
    ...input.room,
    stateVersion: input.room.stateVersion + 1,
    state: definition.serializeState(result.state),
    status: definition.getRoomStatus(result.state),
  };
};

export const leaveRoomSnapshot = (room: RoomSnapshot, playerId: string): LeaveRoomResult => {
  if (room.status !== 'waiting') {
    throw new Error('Cannot leave a room after the game has started.');
  }

  const nextSeats = room.seats.filter((seat) => seat.playerId !== playerId);

  if (nextSeats.length === room.seats.length) {
    return {
      deletedRoomId: null,
      room,
    };
  }

  if (nextSeats.length === 0) {
    return {
      deletedRoomId: room.id,
      room: null,
    };
  }

  return {
    deletedRoomId: null,
    room: {
      ...room,
      seats: nextSeats.map((seat, index) => ({
        ...seat,
        id: `seat-${index + 1}`,
      })),
    },
  };
};
