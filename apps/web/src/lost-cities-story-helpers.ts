import {
  lostCitiesGameDefinition,
  setupGameWithSeed,
  type Card,
  type GameState as LostCitiesState,
  type PlayerView as LostCitiesPlayerView,
} from '@games/lost-cities';
import { type ActiveRoomSnapshot, type PlayerSeat } from '@games/game-sdk';

const players = [
  { id: 'player-ada', displayName: 'Ada' },
  { id: 'player-grace', displayName: 'Grace' },
] as const;

const activeSeats: readonly PlayerSeat[] = players.map((player, index) => ({
  id: `seat-${index + 1}`,
  playerId: player.id,
  displayName: player.displayName,
}));

const standardConfig = lostCitiesGameDefinition.normalizeConfig({
  expeditionMode: 'standard',
});

const longConfig = lostCitiesGameDefinition.normalizeConfig({
  expeditionMode: 'long',
});

const numberCard = (
  color: Card['color'],
  value: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
): Card => ({
  id: `${color}-${value}`,
  color,
  kind: 'number',
  value,
});

const wagerCard = (
  color: Card['color'],
  index: 1 | 2 | 3 = 1,
): Card => ({
  id: `${color}-wager-${index}`,
  color,
  kind: 'wager',
});

const createBaseState = (mode: 'standard' | 'long', seed: string): LostCitiesState =>
  setupGameWithSeed(players, mode === 'long' ? longConfig : standardConfig, seed);

export const baseLostCitiesState = createBaseState('standard', 'storybook-lost-cities-opening');

export const simulatedMidgameState: LostCitiesState = {
  ...baseLostCitiesState,
  currentRound: 2,
  startingPlayerIndex: 1,
  activePlayerIndex: 0,
  completedRounds: [
    {
      roundNumber: 1,
      startingPlayerIndex: 0,
      scores: [14, 6],
      cumulativeScores: [14, 6],
    },
  ],
  cumulativeScores: [14, 6],
  discardPiles: {
    ...baseLostCitiesState.discardPiles,
    blue: [numberCard('blue', 2), numberCard('blue', 8)],
    red: [wagerCard('red')],
    white: [numberCard('white', 6)],
  },
  players: [
    {
      ...baseLostCitiesState.players[0],
      hand: [
        wagerCard('yellow', 2),
        numberCard('yellow', 9),
        numberCard('blue', 4),
        numberCard('green', 8),
        numberCard('red', 5),
        numberCard('white', 10),
        numberCard('green', 4),
        numberCard('red', 9),
      ],
      expeditions: {
        ...baseLostCitiesState.players[0].expeditions,
        yellow: [wagerCard('yellow'), numberCard('yellow', 4), numberCard('yellow', 7)],
        blue: [numberCard('blue', 5)],
        green: [numberCard('green', 2), numberCard('green', 6)],
      },
    },
    {
      ...baseLostCitiesState.players[1],
      hand: [
        numberCard('yellow', 2),
        numberCard('yellow', 10),
        numberCard('blue', 3),
        numberCard('red', 2),
        numberCard('red', 8),
        numberCard('white', 4),
        numberCard('white', 9),
        wagerCard('green', 2),
      ],
      expeditions: {
        ...baseLostCitiesState.players[1].expeditions,
        white: [numberCard('white', 3), numberCard('white', 8)],
        red: [wagerCard('red', 2), numberCard('red', 4)],
      },
    },
  ],
};

export const simulatedLongGameState: LostCitiesState = {
  ...createBaseState('long', 'storybook-lost-cities-long'),
  currentRound: 3,
  activePlayerIndex: 1,
  completedRounds: [
    {
      roundNumber: 1,
      startingPlayerIndex: 0,
      scores: [9, 2],
      cumulativeScores: [9, 2],
    },
    {
      roundNumber: 2,
      startingPlayerIndex: 0,
      scores: [8, 17],
      cumulativeScores: [17, 19],
    },
  ],
  cumulativeScores: [17, 19],
  discardPiles: {
    yellow: [numberCard('yellow', 6)],
    blue: [numberCard('blue', 7)],
    white: [],
    green: [numberCard('green', 5)],
    red: [wagerCard('red', 3)],
    purple: [numberCard('purple', 8)],
  },
  players: [
    {
      ...createBaseState('long', 'storybook-lost-cities-long').players[0],
      hand: [
        numberCard('purple', 10),
        numberCard('purple', 6),
        numberCard('red', 7),
        numberCard('white', 9),
        wagerCard('blue', 2),
        numberCard('yellow', 8),
        numberCard('green', 9),
        numberCard('blue', 10),
      ],
      expeditions: {
        yellow: [numberCard('yellow', 3), numberCard('yellow', 5)],
        blue: [wagerCard('blue'), numberCard('blue', 4)],
        white: [numberCard('white', 2), numberCard('white', 6)],
        green: [],
        red: [numberCard('red', 4)],
        purple: [wagerCard('purple'), numberCard('purple', 4), numberCard('purple', 7)],
      },
    },
    {
      ...createBaseState('long', 'storybook-lost-cities-long').players[1],
      hand: [
        numberCard('purple', 3),
        numberCard('purple', 9),
        numberCard('red', 10),
        wagerCard('yellow', 2),
        numberCard('green', 10),
        numberCard('white', 7),
        numberCard('blue', 9),
        numberCard('red', 6),
      ],
      expeditions: {
        yellow: [wagerCard('yellow'), numberCard('yellow', 4)],
        blue: [numberCard('blue', 2), numberCard('blue', 6)],
        white: [],
        green: [wagerCard('green'), numberCard('green', 3), numberCard('green', 8)],
        red: [numberCard('red', 2)],
        purple: [numberCard('purple', 5)],
      },
    },
  ],
};

export const simulatedFinishedState: LostCitiesState = {
  ...simulatedLongGameState,
  status: 'finished',
  result: {
    winners: ['player-grace'],
    winningScore: 31,
    scores: [24, 31],
  },
  cumulativeScores: [24, 31],
};

export const lostCitiesStoryPlayerId = players[0].id;
export const lostCitiesStoryGuestId = players[1].id;

export const createLostCitiesRoom = (
  state: LostCitiesState,
  overrides: Partial<ActiveRoomSnapshot> = {},
): ActiveRoomSnapshot => ({
  id: 'lost-cities-story-room',
  gameId: lostCitiesGameDefinition.id,
  config: lostCitiesGameDefinition.serializeConfig(state.config),
  seats: activeSeats,
  stateVersion: 1,
  state: lostCitiesGameDefinition.serializeState(state),
  status: state.status,
  ...overrides,
});

export const createLostCitiesPlayerView = (
  state: LostCitiesState,
  playerId: string | null,
): LostCitiesPlayerView => lostCitiesGameDefinition.selectPlayerView(state, playerId);

export type LostCitiesStoryPerspective = 'active' | 'other' | 'spectator';

export const getLostCitiesActivePlayerId = (state: LostCitiesState): string =>
  state.players[state.activePlayerIndex]!.identity.id;

export const getLostCitiesPerspectivePlayerId = (
  state: LostCitiesState,
  perspective: LostCitiesStoryPerspective,
): string | null => {
  if (perspective === 'spectator') {
    return null;
  }

  const activePlayerId = getLostCitiesActivePlayerId(state);

  if (perspective === 'active') {
    return activePlayerId;
  }

  return state.players.find((player) => player.identity.id !== activePlayerId)?.identity.id ?? activePlayerId;
};
