import type { Meta, StoryObj } from '@storybook/react-vite';
import { reduceGame, type SplendorMove, type SplendorState } from '@games/splendor';
import { SplendorGameView } from '@games/splendor/ui';
import { useEffect, useState } from 'react';

import { PageBackdrop } from './page-backdrop.js';
import {
  baseSplendorState,
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
  beforeState,
  perspective,
}: {
  readonly afterState: SplendorState;
  readonly beforeState: SplendorState;
  readonly perspective: SplendorStoryPerspective;
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
        roomLabel="Room SPLENDOR"
        roomStateVersion={state === beforeState ? 1 : 2}
        roomSummary="3 players · 15 points"
        state={state}
        submitMove={() => undefined}
      />
    </PageBackdrop>
  );
};

const nobleSkipAfter = applyMove(simulatedNobleState, { type: 'skip-noble' });
const blindReserveAfter = applyMove(baseSplendorState, { type: 'reserve-deck', tier: 2 });

const meta = {
  component: SplendorTransitionHarness,
  title: 'Animation/Splendor Transitions',
  args: {
    afterState: primaryHistory[1]!,
    beforeState: primaryHistory[0]!,
    perspective: 'active' as const,
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
      beforeState={primaryHistory[9]!}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};

export const ReserveVisible: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[1]!}
      beforeState={primaryHistory[0]!}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};

export const BlindReserve: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={blindReserveAfter}
      beforeState={baseSplendorState}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};

export const MarketPurchase: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[13]!}
      beforeState={primaryHistory[12]!}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};

export const PurchaseReserved: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={primaryHistory[14]!}
      beforeState={primaryHistory[13]!}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};

export const Discard: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={discardHistory[29]!}
      beforeState={discardHistory[28]!}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};

export const NobleSkip: Story = {
  args: {},
  render: (_args, context) => (
    <SplendorTransitionHarness
      afterState={nobleSkipAfter}
      beforeState={simulatedNobleState}
      perspective={getStoryPerspective(context.globals.splendorPerspective)}
    />
  ),
};
