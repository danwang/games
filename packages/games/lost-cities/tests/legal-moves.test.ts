import { describe, expect, it } from 'vitest';

import { listLegalMoves } from '../src/rules/legal-moves.js';
import { setupGameWithSeed } from '../src/rules/setup-with-seed.js';

describe('listLegalMoves', () => {
  it('does not allow drawing back the just-discarded card', () => {
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
      'legal-moves',
    );
    const card = state.players[0].hand[0]!;
    const moves = listLegalMoves({
      ...state,
      discardPiles: {
        ...state.discardPiles,
        blue: [{ id: 'blue-2', color: 'blue', kind: 'number', value: 2 }],
      },
    });

    const illegalSelfPickup = moves.find(
      (move) =>
        move.type === 'discard' &&
        move.cardId === card.id &&
        move.drawSource.type === 'discard' &&
        move.drawSource.color === card.color,
    );

    expect(illegalSelfPickup).toBeUndefined();
  });

  it('only allows wagers before numbered cards in an expedition', () => {
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
      'wager-rule',
    );
    const wager = { id: 'yellow-wager-1', color: 'yellow', kind: 'wager' } as const;
    const moves = listLegalMoves({
      ...state,
      players: [
        {
          ...state.players[0],
          hand: [wager],
          expeditions: {
            ...state.players[0].expeditions,
            yellow: [{ id: 'yellow-4', color: 'yellow', kind: 'number', value: 4 }],
          },
        },
        state.players[1],
      ],
    });

    expect(moves.some((move) => move.type === 'play' && move.cardId === wager.id)).toBe(false);
  });
});
