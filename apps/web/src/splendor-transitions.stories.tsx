import type { Meta, StoryObj } from '@storybook/react-vite';
import { reduceGame, splendorGameDefinition, type SplendorMove, type SplendorState } from '@games/splendor';
import { SplendorGameView } from '@games/splendor/ui';
import { useEffect, useState } from 'react';
import type { ActiveRoomSnapshot } from '@games/game-sdk';

import { PageBackdrop } from './page-backdrop.js';
import {
  baseSplendorState,
  createDiscardRoomHistoryThrough,
  createPrimaryRoomHistoryThrough,
  createSplendorPlayerView,
  discardHistory,
  getSplendorPerspectivePlayerId,
  primaryHistory,
  simulatedNobleState,
  type SplendorStoryPerspective,
} from './splendor-story-helpers.js';

const getStoryPerspective = (value: unknown): SplendorStoryPerspective =>
  value === 'other' ? 'other' : 'active';

const applyMove = (state: SplendorState, move: SplendorMove): SplendorState => {
  const result = reduceGame(state, move);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.state;
};

const SplendorTransitionHarness = ({
  afterState,
  afterStateVersion,
  beforeState,
  beforeStateVersion,
  perspective,
  roomHistory,
}: {
  readonly afterState: SplendorState;
  readonly afterStateVersion: number;
  readonly beforeState: SplendorState;
  readonly beforeStateVersion: number;
  readonly perspective: SplendorStoryPerspective;
  readonly roomHistory: readonly ActiveRoomSnapshot[];
}) => {
  const [runNonce, setRunNonce] = useState(0);
  const [state, setState] = useState(beforeState);

  useEffect(() => {
    setState(beforeState);
    const timeoutId = window.setTimeout(() => {
      setState(afterState);
    }, 160);

    return () => window.clearTimeout(timeoutId);
  }, [afterState, beforeState, runNonce]);

  const playerId = getSplendorPerspectivePlayerId(beforeState, perspective);
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
      <div className="fixed right-3 top-3 z-50">
        <button
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950"
          onClick={() => setRunNonce((current) => current + 1)}
          type="button"
        >
          Replay transition
        </button>
      </div>
      <SplendorGameView
        gameId="splendor"
        leaveRoom={() => undefined}
        playerId={playerId}
        playerView={createSplendorPlayerView(state, playerId)}
        {...roomHistoryProps}
        roomLabel="Room SPLENDOR"
        roomStateVersion={state === beforeState ? beforeStateVersion : afterStateVersion}
        roomSummary="3 players · 15 points"
        state={state}
        submitMove={() => undefined}
      />
    </PageBackdrop>
  );
};

const nobleSkipAfter = applyMove(simulatedNobleState, { type: 'skip-noble' });
const nobleTakeAfter = primaryHistory[88]!;
const blindReserveAfter = applyMove(baseSplendorState, { type: 'reserve-deck', tier: 2 });

const meta = {
  component: SplendorTransitionHarness,
  title: 'Splendor/Animations',
  args: {
    afterState: primaryHistory[1]!,
    afterStateVersion: 2,
    beforeState: primaryHistory[0]!,
    beforeStateVersion: 1,
    perspective: 'active' as const,
    roomHistory: createPrimaryRoomHistoryThrough(1),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
} satisfies Meta<typeof SplendorTransitionHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChipTake: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[10]!}
      afterStateVersion={11}
      beforeState={primaryHistory[9]!}
      beforeStateVersion={10}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(10)}
    />
  ),
};

export const MarketReserve: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[1]!}
      afterStateVersion={2}
      beforeState={primaryHistory[0]!}
      beforeStateVersion={1}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(1)}
    />
  ),
};

export const BlindReserve: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={blindReserveAfter}
      afterStateVersion={2}
      beforeState={baseSplendorState}
      beforeStateVersion={1}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(0)}
    />
  ),
};

export const MarketPurchase: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[13]!}
      afterStateVersion={14}
      beforeState={primaryHistory[12]!}
      beforeStateVersion={13}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(13)}
    />
  ),
};

export const PurchaseReserved: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[14]!}
      afterStateVersion={15}
      beforeState={primaryHistory[13]!}
      beforeStateVersion={14}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(14)}
    />
  ),
};

export const Discard: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={discardHistory[29]!}
      afterStateVersion={30}
      beforeState={discardHistory[28]!}
      beforeStateVersion={29}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createDiscardRoomHistoryThrough(29)}
    />
  ),
};

export const NobleSkip: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={nobleSkipAfter}
      afterStateVersion={2}
      beforeState={simulatedNobleState}
      beforeStateVersion={1}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(12)}
    />
  ),
};

export const NobleTake: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={nobleTakeAfter}
      afterStateVersion={89}
      beforeState={simulatedNobleState}
      beforeStateVersion={13}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
      roomHistory={createPrimaryRoomHistoryThrough(88)}
    />
  ),
};
