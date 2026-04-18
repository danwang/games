import { LOST_CITIES_DECK } from '../model/data/cards.js';
import { type Card, type ExpeditionColor } from '../model/types.js';

const hashSeed = (seed: string): number =>
  Array.from(seed).reduce(
    (state, character) => Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );

const nextRandomState = (state: number): number => {
  let next = state + 0x6d2b79f5;

  next = Math.imul(next ^ (next >>> 15), next | 1);
  next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

  return (next ^ (next >>> 14)) >>> 0;
};

export const shuffleWithSeed = <T>(
  items: readonly T[],
  seed: string,
): readonly T[] => {
  const output = [...items];
  let state = hashSeed(seed);

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = nextRandomState(state);

    const swapIndex = state % (index + 1);
    const current = output[index]!;

    output[index] = output[swapIndex]!;
    output[swapIndex] = current;
  }

  return output;
};

export const createShuffledDeck = (
  seed: string,
  activeColors: readonly ExpeditionColor[],
): readonly Card[] =>
  shuffleWithSeed(
    LOST_CITIES_DECK.filter((card) => activeColors.includes(card.color)),
    seed,
  );
