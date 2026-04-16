import {
  CARD_TIERS,
  GEM_COLORS,
  TOKEN_COLORS,
  type Card,
  type CardTier,
  type CostMap,
  type GameState,
  type GemColor,
  type Move,
  type Noble,
  type PaymentSelection,
  type PlayerState,
  type SeatCount,
  type TokenColor,
  type TokenMap,
  type TargetScore,
} from '../model/types.js';
import { listLegalMoves } from '../rules/legal-moves.js';
import { reduceGame } from '../rules/apply-move.js';
import { setupGameWithSeed } from '../rules/setup-with-seed.js';
import {
  type GameConfigField,
  type GameDefinition,
  type GameTransitionResult,
  type PlayerId,
  type PlayerSeat,
  type SerializedValue,
} from '@games/game-sdk';

export interface SplendorConfig {
  readonly seatCount: SeatCount;
  readonly targetScore: TargetScore;
}

export interface SplendorPlayerView {
  readonly activePlayerId: PlayerId;
  readonly legalMoves: readonly Move[];
  readonly playerId: PlayerId | null;
  readonly state: GameState;
}

const defaultConfig: SplendorConfig = {
  seatCount: 2,
  targetScore: 21,
};

const configFields = [
  {
    key: 'seatCount',
    label: 'Seat Count',
    description: 'How many players can join before the game starts.',
    options: [
      { label: '2 players', value: 2 },
      { label: '3 players', value: 3 },
      { label: '4 players', value: 4 },
    ],
  },
  {
    key: 'targetScore',
    label: 'Target Score',
    description: 'Score needed to trigger the final round.',
    options: [
      { label: '15 points', value: 15 },
      { label: '16 points', value: 16 },
      { label: '17 points', value: 17 },
      { label: '18 points', value: 18 },
      { label: '19 points', value: 19 },
      { label: '20 points', value: 20 },
      { label: '21 points', value: 21 },
    ],
  },
] as const satisfies readonly GameConfigField[];

const isSeatCount = (value: unknown): value is SeatCount => value === 2 || value === 3 || value === 4;

const isTargetScore = (value: unknown): value is TargetScore =>
  value === 15 ||
  value === 16 ||
  value === 17 ||
  value === 18 ||
  value === 19 ||
  value === 20 ||
  value === 21;

const failTransition = (message: string): GameTransitionResult<GameState, never> => ({
  ok: false,
  error: {
    code: 'invalid-move',
    message,
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasOwn = <TKey extends string>(
  value: Record<string, unknown>,
  key: TKey,
): value is Record<TKey, unknown> & Record<string, unknown> =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeConfig = (config: unknown): SplendorConfig => {
  if (!config || typeof config !== 'object') {
    return defaultConfig;
  }

  const candidate = config as Partial<SplendorConfig>;

  return {
    seatCount: isSeatCount(candidate.seatCount) ? candidate.seatCount : defaultConfig.seatCount,
    targetScore: isTargetScore(candidate.targetScore)
      ? candidate.targetScore
      : defaultConfig.targetScore,
  };
};

const serializeIdentity = <T>(value: T): SerializedValue => value;

const isTokenColor = (value: unknown): value is TokenColor =>
  typeof value === 'string' && TOKEN_COLORS.includes(value as TokenColor);

const isGemColor = (value: unknown): value is GemColor =>
  typeof value === 'string' && GEM_COLORS.includes(value as GemColor);

const isCardTier = (value: unknown): value is CardTier =>
  typeof value === 'number' && CARD_TIERS.includes(value as CardTier);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isCountRecord = <TKey extends string>(
  value: unknown,
  keys: readonly TKey[],
): value is Readonly<Record<TKey, number>> =>
  isRecord(value) &&
  keys.every((key) => hasOwn(value, key) && isFiniteNumber(value[key])) &&
  Object.keys(value).every((key) => keys.includes(key as TKey));

const isTokenMap = (value: unknown): value is TokenMap => isCountRecord(value, GEM_COLORS);

const isCostMap = (value: unknown): value is CostMap => isCountRecord(value, TOKEN_COLORS);

const isPaymentSelection = (value: unknown): value is PaymentSelection =>
  isRecord(value) &&
  hasOwn(value, 'tokens') &&
  isCostMap(value.tokens) &&
  hasOwn(value, 'gold') &&
  isFiniteNumber(value.gold);

const isCard = (value: unknown): value is Card =>
  isRecord(value) &&
  hasOwn(value, 'id') &&
  typeof value.id === 'string' &&
  hasOwn(value, 'tier') &&
  isCardTier(value.tier) &&
  hasOwn(value, 'points') &&
  isFiniteNumber(value.points) &&
  hasOwn(value, 'bonus') &&
  isTokenColor(value.bonus) &&
  hasOwn(value, 'cost') &&
  isCostMap(value.cost);

const isNoble = (value: unknown): value is Noble =>
  isRecord(value) &&
  hasOwn(value, 'id') &&
  typeof value.id === 'string' &&
  hasOwn(value, 'points') &&
  isFiniteNumber(value.points) &&
  hasOwn(value, 'requirement') &&
  isCostMap(value.requirement);

const isPlayerState = (value: unknown): value is PlayerState =>
  isRecord(value) &&
  hasOwn(value, 'identity') &&
  isRecord(value.identity) &&
  hasOwn(value.identity, 'id') &&
  typeof value.identity.id === 'string' &&
  hasOwn(value.identity, 'displayName') &&
  typeof value.identity.displayName === 'string' &&
  hasOwn(value, 'tokens') &&
  isTokenMap(value.tokens) &&
  hasOwn(value, 'purchasedCards') &&
  Array.isArray(value.purchasedCards) &&
  value.purchasedCards.every(isCard) &&
  hasOwn(value, 'reservedCards') &&
  Array.isArray(value.reservedCards) &&
  value.reservedCards.every(isCard) &&
  hasOwn(value, 'nobles') &&
  Array.isArray(value.nobles) &&
  value.nobles.every(isNoble);

const isDeckOrder = (
  value: unknown,
): value is Readonly<{ tier1: readonly string[]; tier2: readonly string[]; tier3: readonly string[] }> =>
  isRecord(value) &&
  hasOwn(value, 'tier1') &&
  isStringArray(value.tier1) &&
  hasOwn(value, 'tier2') &&
  isStringArray(value.tier2) &&
  hasOwn(value, 'tier3') &&
  isStringArray(value.tier3);

const isTurnState = (value: unknown): value is GameState['turn'] => {
  if (!isRecord(value) || !hasOwn(value, 'kind') || typeof value.kind !== 'string') {
    return false;
  }

  if (
    !hasOwn(value, 'activePlayerIndex') ||
    !Number.isInteger(value.activePlayerIndex) ||
    !hasOwn(value, 'round') ||
    !Number.isInteger(value.round)
  ) {
    return false;
  }

  switch (value.kind) {
    case 'main-action':
      return true;
    case 'discard':
      return hasOwn(value, 'requiredCount') && Number.isInteger(value.requiredCount);
    case 'noble':
      return hasOwn(value, 'eligibleNobleIds') && isStringArray(value.eligibleNobleIds);
    default:
      return false;
  }
};

const isMove = (value: unknown): value is Move => {
  if (!isRecord(value) || !hasOwn(value, 'type') || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'take-distinct':
      return hasOwn(value, 'colors') && Array.isArray(value.colors) && value.colors.every(isTokenColor);
    case 'take-pair':
      return hasOwn(value, 'color') && isTokenColor(value.color);
    case 'reserve-visible':
      return hasOwn(value, 'cardId') && typeof value.cardId === 'string';
    case 'reserve-deck':
      return hasOwn(value, 'tier') && isCardTier(value.tier);
    case 'purchase-visible':
    case 'purchase-reserved':
      return (
        hasOwn(value, 'cardId') &&
        typeof value.cardId === 'string' &&
        hasOwn(value, 'payment') &&
        isPaymentSelection(value.payment)
      );
    case 'claim-noble':
      return hasOwn(value, 'nobleId') && typeof value.nobleId === 'string';
    case 'skip-noble':
      return true;
    case 'discard-tokens':
      return hasOwn(value, 'tokens') && Array.isArray(value.tokens) && value.tokens.every(isGemColor);
    default:
      return false;
  }
};

const isGameState = (value: unknown): value is GameState =>
  isRecord(value) &&
  hasOwn(value, 'config') &&
  isRecord(value.config) &&
  hasOwn(value.config, 'targetScore') &&
  isTargetScore(value.config.targetScore) &&
  hasOwn(value.config, 'seatCount') &&
  isSeatCount(value.config.seatCount) &&
  (!hasOwn(value.config, 'deckOrder') || value.config.deckOrder === undefined || isDeckOrder(value.config.deckOrder)) &&
  (!hasOwn(value.config, 'nobleOrder') || value.config.nobleOrder === undefined || isStringArray(value.config.nobleOrder)) &&
  hasOwn(value, 'status') &&
  (value.status === 'in_progress' || value.status === 'finished') &&
  hasOwn(value, 'turn') &&
  isTurnState(value.turn) &&
  hasOwn(value, 'bank') &&
  isTokenMap(value.bank) &&
  hasOwn(value, 'market') &&
  isRecord(value.market) &&
  hasOwn(value.market, 'tier1') &&
  Array.isArray(value.market.tier1) &&
  value.market.tier1.every(isCard) &&
  hasOwn(value.market, 'tier2') &&
  Array.isArray(value.market.tier2) &&
  value.market.tier2.every(isCard) &&
  hasOwn(value.market, 'tier3') &&
  Array.isArray(value.market.tier3) &&
  value.market.tier3.every(isCard) &&
  hasOwn(value, 'decks') &&
  isDeckOrder(value.decks) &&
  hasOwn(value, 'nobles') &&
  Array.isArray(value.nobles) &&
  value.nobles.every(isNoble) &&
  hasOwn(value, 'players') &&
  Array.isArray(value.players) &&
  value.players.every(isPlayerState) &&
  (!hasOwn(value, 'result') ||
    value.result === undefined ||
    (isRecord(value.result) &&
      hasOwn(value.result, 'winners') &&
      isStringArray(value.result.winners) &&
      hasOwn(value.result, 'winningScore') &&
      isFiniteNumber(value.result.winningScore) &&
      hasOwn(value.result, 'tiedOnCards') &&
      typeof value.result.tiedOnCards === 'boolean'));

const deserializeState = (value: SerializedValue): GameState => {
  if (!isGameState(value)) {
    throw new Error('Invalid Splendor state payload.');
  }

  return value;
};

const deserializeMove = (value: SerializedValue): Move => {
  if (!isMove(value)) {
    throw new Error('Invalid Splendor move payload.');
  }

  return value;
};

const validateSeats = (config: SplendorConfig, seats: readonly PlayerSeat[]): void => {
  if (seats.length !== config.seatCount) {
    throw new Error(`Expected ${config.seatCount} seats, received ${seats.length}.`);
  }

  const seatIds = new Set(seats.map((seat) => seat.id));
  const playerIds = new Set(seats.map((seat) => seat.playerId));

  if (seatIds.size !== seats.length) {
    throw new Error('Seat ids must be unique within a room.');
  }

  if (playerIds.size !== seats.length) {
    throw new Error('Player ids must be unique within a room.');
  }
};

const createInitialState = (
  config: SplendorConfig,
  seats: readonly PlayerSeat[],
  seed: string,
): GameState => {
  return setupGameWithSeed(
    seats.map((seat) => ({
      id: seat.playerId,
      displayName: seat.displayName,
    })),
    config,
    seed,
  );
};

const listMovesForPlayer = (state: GameState, playerId: PlayerId): readonly Move[] => {
  const activePlayer = state.players[state.turn.activePlayerIndex];

  if (!activePlayer || activePlayer.identity.id !== playerId) {
    return [];
  }

  return listLegalMoves(state);
};

const applyMoveForPlayer = (
  state: GameState,
  playerId: PlayerId,
  move: Move,
): GameTransitionResult<GameState, never> => {
  const activePlayer = state.players[state.turn.activePlayerIndex];

  if (!activePlayer) {
    return failTransition('The active player could not be resolved.');
  }

  if (activePlayer.identity.id !== playerId) {
    return failTransition('It is not this player’s turn.');
  }

  const result = reduceGame(state, move);

  if (!result.ok) {
    return failTransition(result.error.message);
  }

  return {
    ok: true,
    state: result.state,
    events: [],
  };
};

const selectPlayerView = (
  state: GameState,
  playerId: PlayerId | null,
): SplendorPlayerView => ({
  activePlayerId: state.players[state.turn.activePlayerIndex]?.identity.id ?? '',
  legalMoves: playerId ? listMovesForPlayer(state, playerId) : [],
  playerId,
  state,
});

const getRoomStatus = (state: GameState) => state.status;
const getSeatCount = (config: SplendorConfig) => config.seatCount;

export const splendorGameDefinition = {
  id: 'splendor',
  displayName: 'Splendor',
  description: 'Reference game wired through the shared platform contract.',
  defaultConfig,
  configFields,
  normalizeConfig,
  validateSeats,
  createInitialState,
  listLegalMoves: listMovesForPlayer,
  applyMove: applyMoveForPlayer,
  selectPlayerView,
  serializeConfig: serializeIdentity<SplendorConfig>,
  deserializeConfig: (value: SerializedValue): SplendorConfig => normalizeConfig(value),
  serializeState: serializeIdentity<GameState>,
  deserializeState,
  serializeMove: serializeIdentity<Move>,
  deserializeMove,
  getRoomStatus,
  getSeatCount,
} satisfies GameDefinition<SplendorConfig, GameState, Move, SplendorPlayerView>;

export type { GameState as SplendorState, Move as SplendorMove } from '../model/types.js';
