import { describe, expect, it } from 'vitest';

import { reduceGame } from '../src/rules/apply-move.js';
import { setupGameWithSeed } from '../src/rules/setup-with-seed.js';

describe('reduceGame', () => {
  it('plays a card to an expedition and draws a replacement card', () => {
    const state = setupGameWithSeed(
      [
        { id: 'p1', displayName: 'Ada' },
        { id: 'p2', displayName: 'Grace' },
      ],
      {
        matchLength: 3,
        startingPlayer: 'seat-order',
        expeditionMode: 'standard',
      },
      'apply-play',
    );
    const playable = state.players[0].hand.find((card) => card.kind === 'wager') ?? state.players[0].hand[0]!;
    const result = reduceGame(state, {
      type: 'play',
      cardId: playable.id,
      drawSource: { type: 'deck' },
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.players[0].expeditions[playable.color]).toContainEqual(playable);
      expect(result.state.players[0].hand).toHaveLength(8);
      expect(result.state.activePlayerIndex).toBe(1);
    }
  });

  it('rejects illegal descending expedition plays', () => {
    const state = setupGameWithSeed(
      [
        { id: 'p1', displayName: 'Ada' },
        { id: 'p2', displayName: 'Grace' },
      ],
      {
        matchLength: 3,
        startingPlayer: 'seat-order',
        expeditionMode: 'standard',
      },
      'descending-play',
    );
    const result = reduceGame(
      {
        ...state,
        players: [
          {
            ...state.players[0],
            hand: [{ id: 'red-4', color: 'red', kind: 'number', value: 4 }],
            expeditions: {
              ...state.players[0].expeditions,
              red: [{ id: 'red-6', color: 'red', kind: 'number', value: 6 }],
            },
          },
          state.players[1],
        ],
      },
      {
        type: 'play',
        cardId: 'red-4',
        drawSource: { type: 'deck' },
      },
    );

    expect(result.ok).toBe(false);
  });
});
