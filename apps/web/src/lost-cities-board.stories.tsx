import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';

import { LostCitiesGameView } from '@games/lost-cities/ui';

import { GameRoomScreen } from './game-room-screen.js';
import { PageBackdrop } from './page-backdrop.js';
import {
  baseLostCitiesState,
  createLostCitiesPlayerView,
  createLostCitiesRoom,
  getLostCitiesPerspectivePlayerId,
  lostCitiesStoryPlayerId,
  simulatedFinishedState,
  simulatedLongGameState,
  simulatedMidgameState,
  type LostCitiesStoryPerspective,
} from './lost-cities-story-helpers.js';

const getStoryPerspective = (value: unknown): LostCitiesStoryPerspective =>
  value === 'other' ? 'other' : value === 'spectator' ? 'spectator' : 'active';

const renderRoomScreen = (
  room: ReturnType<typeof createLostCitiesRoom>,
  playerId: string | null,
  overrides: Omit<React.ComponentProps<typeof GameRoomScreen>, 'playerId' | 'room'>,
) => (
  <PageBackdrop>
    <GameRoomScreen {...overrides} playerId={playerId} room={room} />
  </PageBackdrop>
);

const meta = {
  component: GameRoomScreen,
  title: 'Lost Cities/Board',
  args: {
    leaveRoom: () => undefined,
    playerId: lostCitiesStoryPlayerId,
    startRoom: () => undefined,
    submitMove: () => undefined,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
} satisfies Meta<typeof GameRoomScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpeningTurn: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const playerId = getLostCitiesPerspectivePlayerId(baseLostCitiesState, perspective);

    return renderRoomScreen(createLostCitiesRoom(baseLostCitiesState), playerId, args);
  },
  args: {
    room: createLostCitiesRoom(baseLostCitiesState),
  },
};

export const MidgamePressure: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const room = createLostCitiesRoom(simulatedMidgameState, { stateVersion: 8 });
    const playerId = getLostCitiesPerspectivePlayerId(simulatedMidgameState, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createLostCitiesRoom(simulatedMidgameState, { stateVersion: 8 }),
  },
};

export const LongVariant: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const room = createLostCitiesRoom(simulatedLongGameState, { stateVersion: 11 });
    const playerId = getLostCitiesPerspectivePlayerId(simulatedLongGameState, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createLostCitiesRoom(simulatedLongGameState, { stateVersion: 11 }),
  },
};

export const Finished: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const room = createLostCitiesRoom(simulatedFinishedState, {
      stateVersion: 15,
      status: 'finished',
    });
    const playerId = getLostCitiesPerspectivePlayerId(simulatedFinishedState, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createLostCitiesRoom(simulatedFinishedState, {
      stateVersion: 15,
      status: 'finished',
    }),
  },
};
