import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';

import { SplendorGameView } from '@games/splendor/ui';

import { PageBackdrop } from './page-backdrop.js';
import {
  baseSplendorState,
  createSplendorPlayerView,
  getSplendorPerspectivePlayerId,
  type SplendorStoryPerspective,
  withDiscardPhase,
  withNobleChoice,
  withReservedPressure,
} from './splendor-story-helpers.js';

const reservedPressureState = withReservedPressure();
const discardPhaseState = withDiscardPhase();
const nobleChoiceState = withNobleChoice();
const getStoryPerspective = (value: unknown): SplendorStoryPerspective =>
  value === 'other' ? 'other' : 'active';

const renderSplendorStory = (
  state: typeof baseSplendorState,
  selection: ComponentProps<typeof SplendorGameView>['initialSelection'],
  roomStateVersion: number,
  perspective: SplendorStoryPerspective,
) => {
  const playerId = getSplendorPerspectivePlayerId(state, perspective);
  const isActivePerspective = playerId === state.players[state.turn.activePlayerIndex]?.identity.id;
  const selectionProps =
    selection === undefined || !isActivePerspective ? {} : { initialSelection: selection };

  return (
    <PageBackdrop>
      <SplendorGameView
        gameId="splendor"
        {...selectionProps}
        leaveRoom={() => undefined}
        playerId={playerId}
        playerView={createSplendorPlayerView(state, playerId)}
        roomLabel="Room SPLENDOR"
        roomStateVersion={roomStateVersion}
        roomSummary="3 players · 15 points"
        state={state}
        submitMove={() => undefined}
      />
    </PageBackdrop>
  );
};

const meta = {
  component: SplendorGameView,
  title: 'Splendor/Interactions',
  args: {
    gameId: 'splendor',
    leaveRoom: () => undefined,
    playerId: getSplendorPerspectivePlayerId(baseSplendorState, 'active'),
    playerView: createSplendorPlayerView(
      baseSplendorState,
      getSplendorPerspectivePlayerId(baseSplendorState, 'active'),
    ),
    roomLabel: 'Room SPLENDOR',
    roomStateVersion: 1,
    roomSummary: '3 players · 15 points',
    state: baseSplendorState,
    submitMove: () => undefined,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
} satisfies Meta<typeof SplendorGameView>;

export default meta;

type Story = StoryObj<typeof meta>;

const reservedCardId = reservedPressureState.players[reservedPressureState.turn.activePlayerIndex]!
  .reservedCards[0]!.id;
const activePlayerSheetId =
  reservedPressureState.players[reservedPressureState.turn.activePlayerIndex]!.identity.id;

export const OpeningTurnClickable: Story = {
  render: (_args, context) =>
    renderSplendorStory(baseSplendorState, null, 1, getStoryPerspective(context.globals.splendorPerspective)),
};

export const MidgameClickable: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      reservedPressureState,
      null,
      8,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    roomStateVersion: 8,
    state: reservedPressureState,
  },
};

export const BankModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'bank' },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: { type: 'bank' },
  },
};

export const MarketCardModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'market-card', cardId: baseSplendorState.market.tier1[0]!.id },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: { type: 'market-card', cardId: baseSplendorState.market.tier1[0]!.id },
  },
};

export const ReservedCardModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      reservedPressureState,
      { type: 'reserved-card', cardId: reservedCardId },
      8,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: { type: 'reserved-card', cardId: reservedCardId },
    roomStateVersion: 8,
    state: reservedPressureState,
  },
};

export const DeckModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'deck', tier: 2 },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: { type: 'deck', tier: 2 },
  },
};

export const PlayerModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      reservedPressureState,
      { type: 'player', playerId: activePlayerSheetId },
      8,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: { type: 'player', playerId: activePlayerSheetId },
    roomStateVersion: 8,
    state: reservedPressureState,
  },
};

export const MenuModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'menu' },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    initialSelection: { type: 'menu' },
  },
};

export const DiscardModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      discardPhaseState,
      null,
      11,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    roomStateVersion: 11,
    state: discardPhaseState,
  },
};

export const NobleModal: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      nobleChoiceState,
      null,
      13,
      getStoryPerspective(context.globals.splendorPerspective),
    ),
  args: {
    roomStateVersion: 13,
    state: nobleChoiceState,
  },
};
