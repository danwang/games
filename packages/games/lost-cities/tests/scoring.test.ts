import { describe, expect, it } from 'vitest';

import { reduceGame } from '../src/rules/apply-move.js';
import { scoreExpedition } from '../src/rules/helpers.js';
import { setupGameWithSeed } from '../src/rules/setup-with-seed.js';

describe('Lost Cities scoring', () => {
  it('applies wagers and the 8-card bonus correctly', () => {
    expect(
      scoreExpedition([
        { id: 'yellow-wager-1', color: 'yellow', kind: 'wager' },
        { id: 'yellow-wager-2', color: 'yellow', kind: 'wager' },
        { id: 'yellow-2', color: 'yellow', kind: 'number', value: 2 },
        { id: 'yellow-3', color: 'yellow', kind: 'number', value: 3 },
        { id: 'yellow-4', color: 'yellow', kind: 'number', value: 4 },
        { id: 'yellow-5', color: 'yellow', kind: 'number', value: 5 },
        { id: 'yellow-6', color: 'yellow', kind: 'number', value: 6 },
        { id: 'yellow-7', color: 'yellow', kind: 'number', value: 7 },
      ]),
    ).toBe(41);
  });

  it('ends the match after the third round and resolves winners from cumulative scores', () => {
    const base = setupGameWithSeed(
      [
        { id: 'p1', displayName: 'Ada' },
        { id: 'p2', displayName: 'Grace' },
      ],
      {
        matchLength: 3,
        startingPlayer: 'seat-order',
        expeditionMode: 'standard',
      },
      'final-round',
    );
    const state = {
      ...base,
      currentRound: 3,
      cumulativeScores: [20, 5] as const,
      drawPile: [{ id: 'blue-10', color: 'blue', kind: 'number', value: 10 }] as const,
      players: [
        {
          ...base.players[0],
          hand: [{ id: 'yellow-2', color: 'yellow', kind: 'number', value: 2 }],
          expeditions: {
            ...base.players[0].expeditions,
            yellow: [{ id: 'yellow-10', color: 'yellow', kind: 'number', value: 10 }],
          },
        },
        {
          ...base.players[1],
          hand: [{ id: 'red-2', color: 'red', kind: 'number', value: 2 }],
        },
      ] as const,
    };
    const result = reduceGame(state, {
      type: 'discard',
      cardId: 'yellow-2',
      drawSource: { type: 'deck' },
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.status).toBe('finished');
      expect(result.state.result?.winners).toEqual(['p1']);
      expect(result.state.completedRounds).toHaveLength(1);
    }
  });
});
