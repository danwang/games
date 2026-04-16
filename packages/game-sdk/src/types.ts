import { type ComponentType } from 'react';

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type SerializedValue = unknown;
export type GameId = string;
export type RoomId = string;
export type PlayerId = string;
export type SeatId = string;

export interface PlayerSeat {
  readonly id: SeatId;
  readonly playerId: PlayerId;
  readonly displayName: string;
}

export interface PlayerIdentity {
  readonly playerId: PlayerId;
  readonly displayName: string;
}

export interface GameError {
  readonly code: string;
  readonly message: string;
}

export interface GameTransitionSuccess<TState, TEvent> {
  readonly ok: true;
  readonly state: TState;
  readonly events: readonly TEvent[];
}

export interface GameTransitionFailure {
  readonly ok: false;
  readonly error: GameError;
}

export type GameTransitionResult<TState, TEvent> =
  | GameTransitionSuccess<TState, TEvent>
  | GameTransitionFailure;

export interface GameRenderProps<TState, TMove, TPlayerView> {
  readonly gameId: GameId;
  readonly state: TState;
  readonly roomStateVersion?: number;
  readonly roomHistory?: readonly GameHistoryEntry<TState>[];
  readonly playerId: PlayerId | null;
  readonly playerView: TPlayerView;
  readonly roomLabel?: string;
  readonly roomSummary?: string;
  readonly leaveRoom?: () => void;
  readonly submitMove: (move: TMove) => void;
}

export interface GameClientModule<TState, TMove, TPlayerView> {
  readonly renderGame: ComponentType<GameRenderProps<TState, TMove, TPlayerView>>;
}

export type RoomStatus = 'waiting' | 'in_progress' | 'finished';

export interface GameConfigOption<TValue extends JsonPrimitive = JsonPrimitive> {
  readonly label: string;
  readonly value: TValue;
}

export interface GameConfigField<TValue extends JsonPrimitive = JsonPrimitive> {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
  readonly options: readonly GameConfigOption<TValue>[];
}

export interface GameDefinition<TConfig, TState, TMove, TPlayerView, TEvent = never> {
  readonly id: GameId;
  readonly displayName: string;
  readonly description: string;
  readonly defaultConfig: TConfig;
  readonly configFields: readonly GameConfigField[];
  readonly normalizeConfig: (config: unknown) => TConfig;
  readonly validateSeats: (config: TConfig, seats: readonly PlayerSeat[]) => void;
  readonly createInitialState: (
    config: TConfig,
    seats: readonly PlayerSeat[],
    seed: string,
  ) => TState;
  readonly listLegalMoves: (state: TState, playerId: PlayerId) => readonly TMove[];
  readonly applyMove: (
    state: TState,
    playerId: PlayerId,
    move: TMove,
  ) => GameTransitionResult<TState, TEvent>;
  readonly selectPlayerView: (
    state: TState,
    playerId: PlayerId | null,
  ) => TPlayerView;
  readonly serializeConfig: (config: TConfig) => SerializedValue;
  readonly deserializeConfig: (value: SerializedValue) => TConfig;
  readonly serializeState: (state: TState) => SerializedValue;
  readonly deserializeState: (value: SerializedValue) => TState;
  readonly serializeMove: (move: TMove) => SerializedValue;
  readonly deserializeMove: (value: SerializedValue) => TMove;
  readonly getRoomStatus: (state: TState) => RoomStatus;
  readonly getSeatCount: (config: TConfig) => number;
}

export interface RegisteredGame<TConfig, TState, TMove, TPlayerView, TEvent = never> {
  readonly definition: GameDefinition<TConfig, TState, TMove, TPlayerView, TEvent>;
  readonly client: GameClientModule<TState, TMove, TPlayerView>;
}

export type AnyRegisteredGame = RegisteredGame<unknown, unknown, unknown, unknown, unknown>;

export type ActiveRoomStatus = Exclude<RoomStatus, 'waiting'>;

interface BaseRoomSnapshot {
  readonly id: RoomId;
  readonly gameId: GameId;
  readonly config: SerializedValue;
  readonly seats: readonly PlayerSeat[];
}

export interface WaitingRoomSnapshot extends BaseRoomSnapshot {
  readonly stateVersion: 0;
  readonly state: null;
  readonly status: 'waiting';
}

export interface ActiveRoomSnapshot extends BaseRoomSnapshot {
  readonly stateVersion: number;
  readonly state: SerializedValue;
  readonly status: ActiveRoomStatus;
}

export type RoomSnapshot = WaitingRoomSnapshot | ActiveRoomSnapshot;

export interface GameHistoryEntry<TState> {
  readonly stateVersion: number;
  readonly state: TState;
  readonly status: ActiveRoomStatus;
}

export interface LobbyRoomSummary {
  readonly id: RoomId;
  readonly gameId: GameId;
  readonly status: RoomStatus;
  readonly stateVersion: number;
  readonly config: SerializedValue;
  readonly seatCount: number;
  readonly occupiedSeatCount: number;
}

export interface LobbySnapshot {
  readonly rooms: readonly LobbyRoomSummary[];
}

export type ClientMessage =
  | {
      readonly type: 'identify';
      readonly player: PlayerIdentity;
    }
  | {
      readonly type: 'subscribe-lobby';
    }
  | {
      readonly type: 'unsubscribe-lobby';
    }
  | {
      readonly type: 'create-room';
      readonly gameId: GameId;
      readonly config?: SerializedValue;
    }
  | {
      readonly type: 'join-room';
      readonly roomId: RoomId;
    }
  | {
      readonly type: 'start-room';
      readonly roomId: RoomId;
    }
  | {
      readonly type: 'leave-room';
      readonly roomId: RoomId;
    }
  | {
      readonly type: 'submit-move';
      readonly roomId: RoomId;
      readonly stateVersion: number;
      readonly move: SerializedValue;
    };

export type ServerMessage =
  | {
      readonly type: 'lobby-snapshot';
      readonly lobby: LobbySnapshot;
    }
  | {
      readonly type: 'room-created';
      readonly roomId: RoomId;
    }
  | {
      readonly type: 'room-snapshot';
      readonly room: RoomSnapshot;
    }
  | {
      readonly type: 'error';
      readonly error: GameError;
    };
