import { ALL_EXPEDITION_COLORS, NUMBER_VALUES, type Card } from '../types.js';

export const LOST_CITIES_DECK: readonly Card[] = ALL_EXPEDITION_COLORS.flatMap((color) => [
  ...NUMBER_VALUES.map(
    (value) =>
      ({
        id: `${color}-${value}`,
        color,
        kind: 'number',
        value,
      }) satisfies Card,
  ),
  { id: `${color}-wager-1`, color, kind: 'wager' } satisfies Card,
  { id: `${color}-wager-2`, color, kind: 'wager' } satisfies Card,
  { id: `${color}-wager-3`, color, kind: 'wager' } satisfies Card,
]);
