import { type GameConfig, type GameState, type PlayerIdentity, type PlayerState } from '../model/types.js';
import { createShuffledDeck } from './randomness.js';
import { createExpeditionMap, getActiveColors, sortHand } from './helpers.js';

const CARDS_PER_HAND = 8;

const createPlayer = (identity: PlayerIdentity, hand: PlayerState['hand']): PlayerState => ({
  identity,
  hand: sortHand(hand),
  expeditions: createExpeditionMap(() => []),
});

const createRoundState = (
  players: readonly [PlayerIdentity, PlayerIdentity],
  config: GameConfig,
  seed: string,
  currentRound: number,
  startingPlayerIndex: number,
  completedRounds: GameState['completedRounds'],
  cumulativeScores: GameState['cumulativeScores'],
): GameState => {
  const deck = createShuffledDeck(`${seed}:round:${currentRound}`, getActiveColors(config));
  const hands = [
    deck.slice(0, CARDS_PER_HAND),
    deck.slice(CARDS_PER_HAND, CARDS_PER_HAND * 2),
  ] as const;
  const drawPile = deck.slice(CARDS_PER_HAND * 2);

  return {
    config,
    status: 'in_progress',
    seed,
    currentRound,
    startingPlayerIndex,
    activePlayerIndex: startingPlayerIndex,
    drawPile,
    discardPiles: createExpeditionMap(() => []),
    players: [
      createPlayer(players[0], hands[0]),
      createPlayer(players[1], hands[1]),
    ],
    completedRounds,
    cumulativeScores,
  };
};

export const createNextRoundState = (
  previousState: GameState,
  startingPlayerIndex: number,
): GameState =>
  createRoundState(
    [previousState.players[0].identity, previousState.players[1].identity],
    previousState.config,
    previousState.seed,
    previousState.currentRound + 1,
    startingPlayerIndex,
    previousState.completedRounds,
    previousState.cumulativeScores,
  );

export const setupGameWithSeed = (
  players: readonly [PlayerIdentity, PlayerIdentity],
  config: GameConfig,
  seed: string,
): GameState => createRoundState(players, config, seed, 1, 0, [], [0, 0]);

export const setupGame = (
  players: readonly [PlayerIdentity, PlayerIdentity],
  config: GameConfig,
): GameState => setupGameWithSeed(players, config, 'lost-cities');
