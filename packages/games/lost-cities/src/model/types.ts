export const ALL_EXPEDITION_COLORS = ['yellow', 'blue', 'white', 'green', 'red', 'purple'] as const;
export const STANDARD_EXPEDITION_COLORS = ['yellow', 'blue', 'white', 'green', 'red'] as const;
export const LONG_EXPEDITION_COLORS = ALL_EXPEDITION_COLORS;
export const NUMBER_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type ExpeditionColor = (typeof ALL_EXPEDITION_COLORS)[number];
export type NumberValue = (typeof NUMBER_VALUES)[number];
export type ExpeditionMode = 'standard' | 'long';

export interface PlayerIdentity {
  readonly id: string;
  readonly displayName: string;
}

export interface NumberCard {
  readonly id: string;
  readonly color: ExpeditionColor;
  readonly kind: 'number';
  readonly value: NumberValue;
}

export interface WagerCard {
  readonly id: string;
  readonly color: ExpeditionColor;
  readonly kind: 'wager';
}

export type Card = NumberCard | WagerCard;

export type ExpeditionMap<TValue> = Readonly<Record<ExpeditionColor, TValue>>;

export interface PlayerState {
  readonly identity: PlayerIdentity;
  readonly hand: readonly Card[];
  readonly expeditions: ExpeditionMap<readonly Card[]>;
}

export interface CompletedRoundSummary {
  readonly roundNumber: number;
  readonly startingPlayerIndex: number;
  readonly scores: readonly number[];
  readonly cumulativeScores: readonly number[];
}

export interface GameResult {
  readonly winners: readonly string[];
  readonly winningScore: number;
  readonly scores: readonly number[];
}

export interface GameConfig {
  readonly matchLength: 3;
  readonly startingPlayer: 'seat-order';
  readonly expeditionMode: ExpeditionMode;
}

export interface DrawDeckSource {
  readonly type: 'deck';
}

export interface DrawDiscardSource {
  readonly type: 'discard';
  readonly color: ExpeditionColor;
}

export type DrawSource = DrawDeckSource | DrawDiscardSource;

export type Move =
  | {
      readonly type: 'play';
      readonly cardId: string;
      readonly drawSource: DrawSource;
    }
  | {
      readonly type: 'discard';
      readonly cardId: string;
      readonly drawSource: DrawSource;
    };

export interface GameState {
  readonly config: GameConfig;
  readonly status: 'in_progress' | 'finished';
  readonly seed: string;
  readonly currentRound: number;
  readonly startingPlayerIndex: number;
  readonly activePlayerIndex: number;
  readonly drawPile: readonly Card[];
  readonly discardPiles: ExpeditionMap<readonly Card[]>;
  readonly players: readonly [PlayerState, PlayerState];
  readonly completedRounds: readonly CompletedRoundSummary[];
  readonly cumulativeScores: readonly [number, number];
  readonly result?: GameResult;
}

export interface PublicPlayerState {
  readonly identity: PlayerIdentity;
  readonly expeditions: ExpeditionMap<readonly Card[]>;
  readonly hand: readonly Card[];
  readonly handCount: number;
}

export interface PlayerView {
  readonly playerId: string | null;
  readonly activePlayerId: string;
  readonly legalMoves: readonly Move[];
  readonly state: {
    readonly status: GameState['status'];
    readonly currentRound: number;
    readonly startingPlayerIndex: number;
    readonly activePlayerIndex: number;
    readonly activeColors: readonly ExpeditionColor[];
    readonly drawCount: number;
    readonly discardPiles: ExpeditionMap<readonly Card[]>;
    readonly players: readonly [PublicPlayerState, PublicPlayerState];
    readonly completedRounds: readonly CompletedRoundSummary[];
    readonly cumulativeScores: readonly [number, number];
    readonly result?: GameResult;
  };
}

export interface ReduceGameSuccess {
  readonly ok: true;
  readonly state: GameState;
}

export interface ReduceGameFailure {
  readonly ok: false;
  readonly error: {
    readonly message: string;
  };
}

export type ReduceGameResult = ReduceGameSuccess | ReduceGameFailure;
