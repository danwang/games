import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import type { ActiveRoomSnapshot } from '@games/game-sdk';

import { SplendorGameView } from '@games/splendor/ui';
import { splendorGameDefinition } from '@games/splendor';

import { PageBackdrop } from './page-backdrop.js';
import {
  baseSplendorState,
  createDiscardRoomHistoryThrough,
  createPrimaryRoomHistoryThrough,
  createSplendorPlayerView,
  getSplendorPerspectivePlayerId,
  getSplendorActivePlayerId,
  type SplendorStoryPerspective,
  withDiscardPhase,
  withNobleChoice,
  withReservedPressure,
} from './splendor-story-helpers.js';

const tokenColorOrder = ['white', 'blue', 'green', 'red', 'black'] as const;

const reservedPressureState = withReservedPressure();
const discardPhaseState = withDiscardPhase();
const nobleChoiceState = withNobleChoice();
const getStoryPerspective = (value: unknown): SplendorStoryPerspective =>
  value === 'other' ? 'other' : 'active';

const emptyChipsState = {
  ...baseSplendorState,
  bank: { ...baseSplendorState.bank, white: 0, red: 0 },
};

const goldShortageCard =
  [...baseSplendorState.market.tier1, ...baseSplendorState.market.tier2, ...baseSplendorState.market.tier3].find(
    (card) => tokenColorOrder.reduce((sum, color) => sum + card.cost[color], 0) >= 3,
  ) ?? baseSplendorState.market.tier1[0]!;

const goldShortageState = (() => {
  const activePlayerId = getSplendorActivePlayerId(baseSplendorState);
  const supportColor =
    tokenColorOrder.find((color) => goldShortageCard.cost[color] > 0) ?? tokenColorOrder[0];
  const totalCost = tokenColorOrder.reduce((sum, color) => sum + goldShortageCard.cost[color], 0);

  return {
    ...baseSplendorState,
    players: baseSplendorState.players.map((player) =>
      player.identity.id !== activePlayerId
        ? player
        : {
            ...player,
            tokens: {
              white: supportColor === 'white' ? 1 : 0,
              blue: supportColor === 'blue' ? 1 : 0,
              green: supportColor === 'green' ? 1 : 0,
              red: supportColor === 'red' ? 1 : 0,
              black: supportColor === 'black' ? 1 : 0,
              gold: Math.max(totalCost - 1, 1),
            },
          },
    ),
  };
})();

const renderSplendorStory = (
  state: typeof baseSplendorState,
  selection: ComponentProps<typeof SplendorGameView>['initialSelection'],
  roomStateVersion: number,
  perspective: SplendorStoryPerspective,
  roomHistory: readonly ActiveRoomSnapshot[] | undefined = undefined,
) => {
  const playerId = getSplendorPerspectivePlayerId(state, perspective);
  const isActivePerspective = playerId === state.players[state.turn.activePlayerIndex]?.identity.id;
  const selectionProps =
    selection === undefined || !isActivePerspective ? {} : { initialSelection: selection };
  const roomHistoryProps =
    roomHistory === undefined
      ? {}
      : {
          roomHistory: roomHistory.map((entry) => ({
            state: splendorGameDefinition.deserializeState(entry.state),
            stateVersion: entry.stateVersion,
            status: entry.status,
          })),
        };

  return (
    <PageBackdrop>
      <SplendorGameView
        gameId="splendor"
        {...selectionProps}
        {...roomHistoryProps}
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
    renderSplendorStory(
      baseSplendorState,
      null,
      1,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(0),
    ),
};

export const MidgameClickable: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      reservedPressureState,
      null,
      41,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(40),
    ),
  args: {
    roomStateVersion: 41,
    state: reservedPressureState,
  },
};

export const BankSheet: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'bank' },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(0),
    ),
  args: {
    initialSelection: { type: 'bank' },
  },
};

export const BankSheetEmptyStacks: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      emptyChipsState,
      { type: 'bank' },
      2,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(0),
    ),
  args: {
    initialSelection: { type: 'bank' },
    roomStateVersion: 2,
    state: emptyChipsState,
  },
};

export const MarketCardSheet: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'market-card', cardId: baseSplendorState.market.tier1[0]!.id },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(0),
    ),
  args: {
    initialSelection: { type: 'market-card', cardId: baseSplendorState.market.tier1[0]!.id },
  },
};

export const MarketCardSheetNeedsGold: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      goldShortageState,
      { type: 'market-card', cardId: goldShortageCard.id },
      2,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(0),
    ),
  args: {
    initialSelection: { type: 'market-card', cardId: goldShortageCard.id },
    roomStateVersion: 2,
    state: goldShortageState,
  },
};

export const ReservedCardSheet: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      reservedPressureState,
      { type: 'reserved-card', cardId: reservedCardId },
      41,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(40),
    ),
  args: {
    initialSelection: { type: 'reserved-card', cardId: reservedCardId },
    roomStateVersion: 41,
    state: reservedPressureState,
  },
};

export const DeckSheet: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      baseSplendorState,
      { type: 'deck', tier: 2 },
      1,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(0),
    ),
  args: {
    initialSelection: { type: 'deck', tier: 2 },
  },
};

export const PlayerSheet: Story = {
  render: (_args, context) =>
    renderSplendorStory(
      reservedPressureState,
      { type: 'player', playerId: activePlayerSheetId },
      41,
      getStoryPerspective(context.globals.splendorPerspective),
      createPrimaryRoomHistoryThrough(40),
    ),
  args: {
    initialSelection: { type: 'player', playerId: activePlayerSheetId },
    roomStateVersion: 41,
    state: reservedPressureState,
  },
};

export const MenuSheet: Story = {
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

export const DiscardStep: Story = {
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

export const NobleChoice: Story = {
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
