import type { Meta, StoryObj } from '@storybook/react-vite';

import { lostCitiesGameDefinition } from '@games/lost-cities';
import { type Card, type GameState } from '@games/lost-cities';

import { GameRoomScreen } from './game-room-screen.js';
import { PageBackdrop } from './page-backdrop.js';

const seats = [
  {
    id: 'seat-1',
    playerId: 'player-ada',
    displayName: 'Ada',
  },
  {
    id: 'seat-2',
    playerId: 'player-grace',
    displayName: 'Grace',
  },
] as const;

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

const standardConfig = lostCitiesGameDefinition.normalizeConfig({
  expeditionMode: 'standard',
});

const longConfig = lostCitiesGameDefinition.normalizeConfig({
  expeditionMode: 'long',
});

const baseStandardState = lostCitiesGameDefinition.createInitialState(
  standardConfig,
  seats,
  'storybook-lost-cities-standard',
);

const activeStandardState = {
  ...baseStandardState,
  discardPiles: {
    ...baseStandardState.discardPiles,
    blue: [numberCard('blue', 2)],
    red: [wagerCard('red')],
  },
  players: [
    {
      ...baseStandardState.players[0],
      expeditions: {
        ...baseStandardState.players[0].expeditions,
        yellow: [wagerCard('yellow'), numberCard('yellow', 4), numberCard('yellow', 7)],
        blue: [numberCard('blue', 5)],
      },
    },
    {
      ...baseStandardState.players[1],
      expeditions: {
        ...baseStandardState.players[1].expeditions,
        green: [wagerCard('green'), numberCard('green', 3), numberCard('green', 6)],
        white: [numberCard('white', 8)],
      },
    },
  ] as const,
} satisfies GameState;

const baseLongState = lostCitiesGameDefinition.createInitialState(
  longConfig,
  seats,
  'storybook-lost-cities-long',
);

const finishedLongState = {
  ...baseLongState,
  status: 'finished' as const,
  currentRound: 3,
  completedRounds: [
    {
      roundNumber: 1,
      startingPlayerIndex: 0,
      scores: [14, 2],
      cumulativeScores: [14, 2],
    },
    {
      roundNumber: 2,
      startingPlayerIndex: 0,
      scores: [8, 18],
      cumulativeScores: [22, 20],
    },
  ],
  cumulativeScores: [41, 31] as const,
  result: {
    winners: ['player-ada'],
    winningScore: 41,
    scores: [41, 31],
  },
  discardPiles: {
    ...baseLongState.discardPiles,
    purple: [numberCard('purple', 8)],
  },
  players: [
    {
      ...baseLongState.players[0],
      expeditions: {
        ...baseLongState.players[0].expeditions,
        purple: [wagerCard('purple'), numberCard('purple', 4), numberCard('purple', 7)],
      },
    },
    {
      ...baseLongState.players[1],
      expeditions: {
        ...baseLongState.players[1].expeditions,
        red: [numberCard('red', 2), numberCard('red', 6)],
      },
    },
  ] as const,
} satisfies GameState;

const meta = {
  component: GameRoomScreen,
  title: 'Lost Cities/Room',
  render: (args) => (
    <PageBackdrop>
      <GameRoomScreen {...args} />
    </PageBackdrop>
  ),
  args: {
    leaveRoom: () => undefined,
    playerId: 'player-ada',
    startRoom: () => undefined,
    submitMove: () => undefined,
  },
} satisfies Meta<typeof GameRoomScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StandardInProgress: Story = {
  args: {
    room: {
      id: 'lost-cities-standard',
      gameId: lostCitiesGameDefinition.id,
      config: lostCitiesGameDefinition.serializeConfig(standardConfig),
      stateVersion: 4,
      seats,
      state: lostCitiesGameDefinition.serializeState(activeStandardState),
      status: 'in_progress',
    },
  },
};

export const LongFinished: Story = {
  args: {
    room: {
      id: 'lost-cities-long',
      gameId: lostCitiesGameDefinition.id,
      config: lostCitiesGameDefinition.serializeConfig(longConfig),
      stateVersion: 12,
      seats,
      state: lostCitiesGameDefinition.serializeState(finishedLongState),
      status: 'finished',
    },
  },
};
