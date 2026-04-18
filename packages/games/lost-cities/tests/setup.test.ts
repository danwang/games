import { describe, expect, it } from 'vitest';

import { setupGameWithSeed } from '../src/rules/setup-with-seed.js';

describe('setupGameWithSeed', () => {
  it('creates a two-player opening state with eight-card hands', () => {
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
      'seed-a',
    );

    expect(state.players[0].hand).toHaveLength(8);
    expect(state.players[1].hand).toHaveLength(8);
    expect(state.drawPile).toHaveLength(44);
    expect(state.activePlayerIndex).toBe(0);
    expect(state.cumulativeScores).toEqual([0, 0]);
  });

  it('shuffles deterministically from the seed', () => {
    const first = setupGameWithSeed(
      [
        { id: 'p1', displayName: 'Ada' },
        { id: 'p2', displayName: 'Grace' },
      ],
      {
        matchLength: 3,
        startingPlayer: 'seat-order',
        expeditionMode: 'standard',
      },
      'same-seed',
    );
    const second = setupGameWithSeed(
      [
        { id: 'p1', displayName: 'Ada' },
        { id: 'p2', displayName: 'Grace' },
      ],
      {
        matchLength: 3,
        startingPlayer: 'seat-order',
        expeditionMode: 'standard',
      },
      'same-seed',
    );

    expect(first.players[0].hand.map((card) => card.id)).toEqual(
      second.players[0].hand.map((card) => card.id),
    );
    expect(first.drawPile.map((card) => card.id)).toEqual(
      second.drawPile.map((card) => card.id),
    );
  });

  it('supports the long game with a sixth purple expedition color', () => {
    const state = setupGameWithSeed(
      [
        { id: 'p1', displayName: 'Ada' },
        { id: 'p2', displayName: 'Grace' },
      ],
      {
        matchLength: 3,
        startingPlayer: 'seat-order',
        expeditionMode: 'long',
      },
      'long-game',
    );

    expect(state.drawPile).toHaveLength(56);
    expect(state.discardPiles.purple).toEqual([]);
    expect(
      [...state.players[0].hand, ...state.players[1].hand, ...state.drawPile].some(
        (card) => card.color === 'purple',
      ),
    ).toBe(true);
  });
});
