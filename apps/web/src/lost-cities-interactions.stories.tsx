import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';

import { LostCitiesGameView } from '@games/lost-cities/ui';

import { PageBackdrop } from './page-backdrop.js';
import {
  baseLostCitiesState,
  createLostCitiesPlayerView,
  getLostCitiesPerspectivePlayerId,
  simulatedLongGameState,
  simulatedMidgameState,
  type LostCitiesStoryPerspective,
} from './lost-cities-story-helpers.js';

const getStoryPerspective = (value: unknown): LostCitiesStoryPerspective =>
  value === 'other' ? 'other' : value === 'spectator' ? 'spectator' : 'active';

const renderLostCitiesStory = (
  state: typeof baseLostCitiesState,
  selection: ComponentProps<typeof LostCitiesGameView>['initialSelection'],
  roomStateVersion: number,
  perspective: LostCitiesStoryPerspective,
) => {
  const playerId = getLostCitiesPerspectivePlayerId(state, perspective);
  const activePlayerId = state.players[state.activePlayerIndex]!.identity.id;
  const selectionProps =
    selection === undefined || playerId !== activePlayerId ? {} : { initialSelection: selection };

  return (
    <PageBackdrop>
      <LostCitiesGameView
        gameId="lost-cities"
        {...selectionProps}
        leaveRoom={() => undefined}
        playerId={playerId}
        playerView={createLostCitiesPlayerView(state, playerId)}
        roomLabel="Room LOST"
        roomStateVersion={roomStateVersion}
        roomSummary={`${state.config.expeditionMode === 'long' ? '6' : '5'} colors`}
        state={state}
        submitMove={() => undefined}
      />
    </PageBackdrop>
  );
};

const openingSelection = baseLostCitiesState.players[baseLostCitiesState.activePlayerIndex]!.hand[0]!.id;
const midgameSelection = simulatedMidgameState.players[simulatedMidgameState.activePlayerIndex]!.hand[1]!.id;
const longSelection = simulatedLongGameState.players[simulatedLongGameState.activePlayerIndex]!.hand[0]!.id;

const meta = {
  component: LostCitiesGameView,
  title: 'Lost Cities/Interactions',
  args: {
    gameId: 'lost-cities',
    leaveRoom: () => undefined,
    playerId: getLostCitiesPerspectivePlayerId(baseLostCitiesState, 'active'),
    playerView: createLostCitiesPlayerView(
      baseLostCitiesState,
      getLostCitiesPerspectivePlayerId(baseLostCitiesState, 'active'),
    ),
    roomLabel: 'Room LOST',
    roomStateVersion: 1,
    roomSummary: '5 colors',
    state: baseLostCitiesState,
    submitMove: () => undefined,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
} satisfies Meta<typeof LostCitiesGameView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpeningTurnClickable: Story = {
  render: (_args, context) =>
    renderLostCitiesStory(
      baseLostCitiesState,
      null,
      1,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
};

export const OpeningCardSheet: Story = {
  render: (_args, context) =>
    renderLostCitiesStory(
      baseLostCitiesState,
      openingSelection,
      1,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: openingSelection,
  },
};

export const MidgameCardSheet: Story = {
  render: (_args, context) =>
    renderLostCitiesStory(
      simulatedMidgameState,
      midgameSelection,
      8,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: midgameSelection,
    roomStateVersion: 8,
    state: simulatedMidgameState,
  },
};

export const LongVariantCardSheet: Story = {
  render: (_args, context) =>
    renderLostCitiesStory(
      simulatedLongGameState,
      longSelection,
      11,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: longSelection,
    roomStateVersion: 11,
    roomSummary: '6 colors',
    state: simulatedLongGameState,
  },
};

export const SpectatorView: Story = {
  render: (_args, context) =>
    renderLostCitiesStory(
      simulatedMidgameState,
      null,
      8,
      getStoryPerspective('spectator'),
    ),
  args: {
    playerId: null,
    roomStateVersion: 8,
    state: simulatedMidgameState,
  },
};
