import type { Meta, StoryObj } from '@storybook/react-vite';
import { SplendorGameView } from '@games/splendor/ui';
import { splendorGameDefinition } from '@games/splendor';

import { GameRoomScreen } from './game-room-screen.js';
import { PageBackdrop } from './page-backdrop.js';
import {
  baseSplendorState,
  createSplendorPlayerView,
  createReplayHistory,
  getSplendorPerspectivePlayerId,
  createSplendorRoom,
  splendorStoryPlayerId,
  type SplendorStoryPerspective,
  withDiscardPhase,
  withFinishedGame,
  withNobleChoice,
  withReservedPressure,
} from './splendor-story-helpers.js';

const discardPhaseState = withDiscardPhase();
const nobleChoiceState = withNobleChoice();
const getStoryPerspective = (value: unknown): SplendorStoryPerspective =>
  value === 'other' ? 'other' : 'active';

const renderRoomScreen = (
  room: ReturnType<typeof createSplendorRoom>,
  playerId: string,
  overrides: Omit<React.ComponentProps<typeof GameRoomScreen>, 'playerId' | 'room'>,
) => (
  <PageBackdrop>
    <GameRoomScreen
      {...overrides}
      playerId={playerId}
      room={room}
    />
  </PageBackdrop>
);

const meta = {
  component: GameRoomScreen,
  title: 'Splendor/Board',
  args: {
    leaveRoom: () => undefined,
    playerId: splendorStoryPlayerId,
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
    const playerId = getSplendorPerspectivePlayerId(baseSplendorState, perspective);

    return renderRoomScreen(createSplendorRoom(baseSplendorState), playerId, args);
  },
  args: {
    room: createSplendorRoom(baseSplendorState),
  },
};

export const DenseMidgame: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const room = createSplendorRoom(withReservedPressure(), { stateVersion: 8 });
    const state = splendorGameDefinition.deserializeState(room.state);
    const playerId = getSplendorPerspectivePlayerId(state, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createSplendorRoom(withReservedPressure(), {
      stateVersion: 8,
    }),
  },
};

export const DiscardPhase: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const room = createSplendorRoom(discardPhaseState, { stateVersion: 11 });
    const playerId = getSplendorPerspectivePlayerId(discardPhaseState, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createSplendorRoom(discardPhaseState, {
      stateVersion: 11,
    }),
  },
};

export const NobleChoice: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const room = createSplendorRoom(nobleChoiceState, { stateVersion: 13 });
    const playerId = getSplendorPerspectivePlayerId(nobleChoiceState, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createSplendorRoom(nobleChoiceState, {
      stateVersion: 13,
    }),
  },
};

export const Finished: Story = {
  render: (args, context) => {
    const perspective = getStoryPerspective(context.globals.splendorPerspective);
    const state = withFinishedGame();
    const room = createSplendorRoom(state, { stateVersion: 21, status: 'finished' });
    const playerId = getSplendorPerspectivePlayerId(state, perspective);

    return renderRoomScreen(room, playerId, args);
  },
  args: {
    room: createSplendorRoom(withFinishedGame(), {
      stateVersion: 21,
      status: 'finished',
    }),
  },
};

export const ReplayLog: Story = {
  args: {
    leaveRoom: () => undefined,
    playerId: splendorStoryPlayerId,
    room: createReplayHistory()[1]!,
    roomHistory: createReplayHistory(),
    startRoom: () => undefined,
    submitMove: () => undefined,
  },
  render: () => {
    const replayHistory = createReplayHistory();
    const liveRoom = replayHistory[1]!;
    const state = splendorGameDefinition.deserializeState(liveRoom.state);
    const playerId = getSplendorPerspectivePlayerId(state, 'active');

    return (
      <PageBackdrop>
        <SplendorGameView
          gameId="splendor"
          initialPanel="log"
          leaveRoom={() => undefined}
          playerId={playerId}
          playerView={createSplendorPlayerView(state, playerId)}
          roomHistory={replayHistory.map((entry) => ({
            state: splendorGameDefinition.deserializeState(entry.state),
            stateVersion: entry.stateVersion,
            status: entry.status,
          }))}
          roomLabel="Room SPLENDOR"
          roomStateVersion={liveRoom.stateVersion}
          roomSummary="3 players · 15 points"
          state={state}
          submitMove={() => undefined}
        />
      </PageBackdrop>
    );
  },
};
