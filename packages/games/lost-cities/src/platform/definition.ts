import {
  ALL_EXPEDITION_COLORS,
  NUMBER_VALUES,
  type ExpeditionMode,
  type Card,
  type ExpeditionColor,
  type GameConfig,
  type GameState,
  type Move,
  type PlayerState,
  type PlayerView,
} from '../model/types.js';
import { listLegalMoves } from '../rules/legal-moves.js';
import { reduceGame } from '../rules/apply-move.js';
import { getActiveColors } from '../rules/helpers.js';
import { setupGameWithSeed } from '../rules/setup-with-seed.js';
import {
  type GameConfigField,
  type GameDefinition,
  type GameTransitionResult,
  type PlayerId,
  type PlayerSeat,
  type SerializedValue,
} from '@games/game-sdk';

const defaultConfig: GameConfig = {
  matchLength: 3,
  startingPlayer: 'seat-order',
  expeditionMode: 'standard',
};

const configFields = [
  {
    key: 'expeditionMode',
    label: 'Expedition Mode',
    description: 'Standard uses 5 colors. Long adds the purple expedition for a 6-color game.',
    options: [
      { label: 'Standard (5 colors)', value: 'standard' },
      { label: 'Long (6 colors)', value: 'long' },
    ],
  },
] as const satisfies readonly GameConfigField[];

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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPlayerId = (value: unknown): value is PlayerId => typeof value === 'string';

const isExpeditionMode = (value: unknown): value is ExpeditionMode =>
  value === 'standard' || value === 'long';

const isExpeditionColor = (value: unknown): value is ExpeditionColor =>
  typeof value === 'string' && ALL_EXPEDITION_COLORS.includes(value as ExpeditionColor);

const isCard = (value: unknown): value is Card => {
  if (
    !isRecord(value) ||
    !hasOwn(value, 'id') ||
    typeof value.id !== 'string' ||
    !hasOwn(value, 'color') ||
    !isExpeditionColor(value.color) ||
    !hasOwn(value, 'kind') ||
    typeof value.kind !== 'string'
  ) {
    return false;
  }

  if (value.kind === 'wager') {
    return true;
  }

  return (
    value.kind === 'number' &&
    hasOwn(value, 'value') &&
    typeof value.value === 'number' &&
    NUMBER_VALUES.includes(value.value as (typeof NUMBER_VALUES)[number])
  );
};

const isCardArray = (value: unknown): value is readonly Card[] =>
  Array.isArray(value) && value.every(isCard);

const isExpeditionMap = (
  value: unknown,
): value is GameState['discardPiles'] =>
  isRecord(value) &&
  ALL_EXPEDITION_COLORS.every((color) => hasOwn(value, color) && isCardArray(value[color])) &&
  Object.keys(value).every((key) => ALL_EXPEDITION_COLORS.includes(key as ExpeditionColor));

const isPlayerState = (value: unknown): value is PlayerState =>
  isRecord(value) &&
  hasOwn(value, 'identity') &&
  isRecord(value.identity) &&
  hasOwn(value.identity, 'id') &&
  typeof value.identity.id === 'string' &&
  hasOwn(value.identity, 'displayName') &&
  typeof value.identity.displayName === 'string' &&
  hasOwn(value, 'hand') &&
  isCardArray(value.hand) &&
  hasOwn(value, 'expeditions') &&
  isExpeditionMap(value.expeditions);

const isCompletedRoundSummaryArray = (value: unknown): value is GameState['completedRounds'] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      isRecord(entry) &&
      hasOwn(entry, 'roundNumber') &&
      isFiniteNumber(entry.roundNumber) &&
      hasOwn(entry, 'startingPlayerIndex') &&
      isFiniteNumber(entry.startingPlayerIndex) &&
      hasOwn(entry, 'scores') &&
      Array.isArray(entry.scores) &&
      entry.scores.length === 2 &&
      entry.scores.every(isFiniteNumber) &&
      hasOwn(entry, 'cumulativeScores') &&
      Array.isArray(entry.cumulativeScores) &&
      entry.cumulativeScores.length === 2 &&
      entry.cumulativeScores.every(isFiniteNumber),
  );

const isGameResult = (value: unknown): value is NonNullable<GameState['result']> =>
  isRecord(value) &&
  hasOwn(value, 'winners') &&
  Array.isArray(value.winners) &&
  value.winners.every((entry) => typeof entry === 'string') &&
  hasOwn(value, 'winningScore') &&
  isFiniteNumber(value.winningScore) &&
  hasOwn(value, 'scores') &&
  Array.isArray(value.scores) &&
  value.scores.length === 2 &&
  value.scores.every(isFiniteNumber);

const isDrawSource = (value: unknown): value is Move['drawSource'] => {
  if (!isRecord(value) || !hasOwn(value, 'type') || typeof value.type !== 'string') {
    return false;
  }

  if (value.type === 'deck') {
    return true;
  }

  return value.type === 'discard' && hasOwn(value, 'color') && isExpeditionColor(value.color);
};

const isMove = (value: unknown): value is Move =>
  isRecord(value) &&
  hasOwn(value, 'type') &&
  (value.type === 'play' || value.type === 'discard') &&
  hasOwn(value, 'cardId') &&
  typeof value.cardId === 'string' &&
  hasOwn(value, 'drawSource') &&
  isDrawSource(value.drawSource);

const normalizeConfig = (config: unknown): GameConfig => {
  if (!config || typeof config !== 'object') {
    return defaultConfig;
  }

  const candidate = config as Partial<GameConfig>;

  return {
    ...defaultConfig,
    expeditionMode: isExpeditionMode(candidate.expeditionMode)
      ? candidate.expeditionMode
      : defaultConfig.expeditionMode,
  };
};

const serializeIdentity = <T>(value: T): SerializedValue => value;

const deserializeState = (value: SerializedValue): GameState => {
  if (
    !isRecord(value) ||
    !hasOwn(value, 'config') ||
    !isRecord(value.config) ||
    !hasOwn(value, 'status') ||
    (value.status !== 'in_progress' && value.status !== 'finished') ||
    !hasOwn(value, 'seed') ||
    typeof value.seed !== 'string' ||
    !hasOwn(value, 'currentRound') ||
    !isFiniteNumber(value.currentRound) ||
    !hasOwn(value, 'startingPlayerIndex') ||
    !isFiniteNumber(value.startingPlayerIndex) ||
    !hasOwn(value, 'activePlayerIndex') ||
    !isFiniteNumber(value.activePlayerIndex) ||
    !hasOwn(value, 'drawPile') ||
    !isCardArray(value.drawPile) ||
    !hasOwn(value, 'discardPiles') ||
    !isExpeditionMap(value.discardPiles) ||
    !hasOwn(value, 'players') ||
    !Array.isArray(value.players) ||
    value.players.length !== 2 ||
    !value.players.every(isPlayerState) ||
    !hasOwn(value, 'completedRounds') ||
    !isCompletedRoundSummaryArray(value.completedRounds) ||
    !hasOwn(value, 'cumulativeScores') ||
    !Array.isArray(value.cumulativeScores) ||
    value.cumulativeScores.length !== 2 ||
    !value.cumulativeScores.every(isFiniteNumber)
  ) {
    throw new Error('Invalid Lost Cities state payload.');
  }

  if (
    hasOwn(value, 'result') &&
    value.result !== undefined &&
    value.result !== null &&
    !isGameResult(value.result)
  ) {
    throw new Error('Invalid Lost Cities result payload.');
  }

  return value as GameState;
};

const selectPlayerView = (state: GameState, playerId: PlayerId | null): PlayerView => {
  const viewerIndex = playerId
    ? state.players.findIndex((player) => player.identity.id === playerId)
    : -1;
  const players: PlayerView['state']['players'] = [
    {
      identity: state.players[0].identity,
      expeditions: state.players[0].expeditions,
      hand: viewerIndex === 0 ? state.players[0].hand : [],
      handCount: state.players[0].hand.length,
    },
    {
      identity: state.players[1].identity,
      expeditions: state.players[1].expeditions,
      hand: viewerIndex === 1 ? state.players[1].hand : [],
      handCount: state.players[1].hand.length,
    },
  ];
  const activePlayer = state.players[state.activePlayerIndex];

  if (!activePlayer) {
    throw new Error('Invalid Lost Cities state: active player missing.');
  }

  return {
    playerId,
    activePlayerId: activePlayer.identity.id,
    legalMoves:
      playerId !== null && activePlayer.identity.id === playerId ? listLegalMoves(state) : [],
    state: {
      status: state.status,
      currentRound: state.currentRound,
      startingPlayerIndex: state.startingPlayerIndex,
      activePlayerIndex: state.activePlayerIndex,
      activeColors: getActiveColors(state.config),
      drawCount: state.drawPile.length,
      discardPiles: state.discardPiles,
      players,
      completedRounds: state.completedRounds,
      cumulativeScores: state.cumulativeScores,
      ...(state.result ? { result: state.result } : {}),
    },
  };
};

export const lostCitiesGameDefinition: GameDefinition<
  GameConfig,
  GameState,
  Move,
  PlayerView
> = {
  id: 'lost-cities',
  displayName: 'Lost Cities',
  description: 'Two-player expedition card game with ascending runs, wagers, and match scoring.',
  defaultConfig,
  configFields,
  normalizeConfig,
  validateSeats: (config, seats) => {
    if (
      config.matchLength !== 3 ||
      config.startingPlayer !== 'seat-order' ||
      !isExpeditionMode(config.expeditionMode)
    ) {
      throw new Error('Lost Cities config is invalid.');
    }

    if (seats.length !== 2) {
      throw new Error('Lost Cities requires exactly two seats.');
    }
  },
  createInitialState: (config, seats, seed) => {
    const firstSeat = seats[0];
    const secondSeat = seats[1];

    if (!firstSeat || !secondSeat) {
      throw new Error('Lost Cities requires exactly two seats.');
    }

    const players = [
      {
        id: firstSeat.playerId,
        displayName: firstSeat.displayName,
      },
      {
        id: secondSeat.playerId,
        displayName: secondSeat.displayName,
      },
    ] as const;

    return setupGameWithSeed(players, config, seed);
  },
  listLegalMoves: (state, playerId) => {
    const activePlayer = state.players[state.activePlayerIndex];

    if (!activePlayer || activePlayer.identity.id !== playerId) {
      return [];
    }

    return listLegalMoves(state);
  },
  applyMove: (state, playerId, move) => {
    const activePlayer = state.players[state.activePlayerIndex];

    if (!activePlayer || activePlayer.identity.id !== playerId) {
      return failTransition('It is not your turn.');
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
  },
  selectPlayerView,
  serializeConfig: serializeIdentity,
  deserializeConfig: (value) => normalizeConfig(value),
  serializeState: serializeIdentity,
  deserializeState,
  serializeMove: serializeIdentity,
  deserializeMove: (value) => {
    if (!isMove(value)) {
      throw new Error('Invalid Lost Cities move payload.');
    }

    return value;
  },
  getRoomStatus: (state) => state.status,
  getSeatCount: () => 2,
};
