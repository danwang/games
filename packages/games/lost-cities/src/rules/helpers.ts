import {
  ALL_EXPEDITION_COLORS,
  LONG_EXPEDITION_COLORS,
  STANDARD_EXPEDITION_COLORS,
  type Card,
  type ExpeditionColor,
  type ExpeditionMap,
  type GameConfig,
  type GameResult,
  type PlayerState,
} from '../model/types.js';

export const createExpeditionMap = <TValue>(createValue: () => TValue): ExpeditionMap<TValue> =>
  ALL_EXPEDITION_COLORS.reduce<ExpeditionMap<TValue>>(
    (map, color) => ({
      ...map,
      [color]: createValue(),
    }),
    {
      yellow: createValue(),
      blue: createValue(),
      white: createValue(),
      green: createValue(),
      red: createValue(),
      purple: createValue(),
    },
  );

export const getActiveColors = (config: GameConfig): readonly ExpeditionColor[] =>
  config.expeditionMode === 'long' ? LONG_EXPEDITION_COLORS : STANDARD_EXPEDITION_COLORS;

export const replacePlayer = (
  players: readonly [PlayerState, PlayerState],
  index: number,
  player: PlayerState,
): readonly [PlayerState, PlayerState] =>
  index === 0 ? [player, players[1]] : [players[0], player];

export const getTopDiscard = (
  discardPiles: ExpeditionMap<readonly Card[]>,
  color: ExpeditionColor,
): Card | null => discardPiles[color].at(-1) ?? null;

export const drawFromDiscard = (
  discardPiles: ExpeditionMap<readonly Card[]>,
  color: ExpeditionColor,
): {
  readonly card: Card | null;
  readonly discardPiles: ExpeditionMap<readonly Card[]>;
} => {
  const pile = discardPiles[color];
  const card = pile.at(-1) ?? null;

  if (!card) {
    return { card: null, discardPiles };
  }

  return {
    card,
    discardPiles: {
      ...discardPiles,
      [color]: pile.slice(0, -1),
    },
  };
};

export const isPlayableOnExpedition = (
  expedition: readonly Card[],
  card: Card,
): boolean => {
  if (card.kind === 'wager') {
    return expedition.every((entry) => entry.kind === 'wager');
  }

  const numberedCards = expedition.filter(
    (entry): entry is Extract<Card, { readonly kind: 'number' }> => entry.kind === 'number',
  );
  const highestValue = numberedCards.at(-1)?.value ?? null;

  return highestValue === null || card.value > highestValue;
};

export const scoreExpedition = (expedition: readonly Card[]): number => {
  if (expedition.length === 0) {
    return 0;
  }

  const total = expedition.reduce(
    (sum, card) => sum + (card.kind === 'number' ? card.value : 0),
    0,
  );
  const wagerCount = expedition.filter((card) => card.kind === 'wager').length;
  const expeditionScore = (total - 20) * (1 + wagerCount);
  const bonus = expedition.length >= 8 ? 20 : 0;

  return expeditionScore + bonus;
};

export const scorePlayer = (player: PlayerState): number =>
  ALL_EXPEDITION_COLORS.reduce(
    (sum, color) => sum + scoreExpedition(player.expeditions[color]),
    0,
  );

export const resolveGameResult = (
  players: readonly [PlayerState, PlayerState],
  scores: readonly [number, number],
): GameResult => {
  const winningScore = Math.max(...scores);
  const winners = players
    .filter((player, index) => scores[index] === winningScore)
    .map((player) => player.identity.id);

  return {
    winners,
    winningScore,
    scores,
  };
};

export const sortHand = (hand: readonly Card[]): readonly Card[] =>
  [...hand].sort((left, right) => left.id.localeCompare(right.id));
