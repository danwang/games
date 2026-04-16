import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  bulge,
  checkpoint,
  expand,
  flip,
  land,
  parallel,
  pulseNumber,
  serial,
  translate,
  type Animation,
} from '@games/animation-core';
import { useAnimationRunner } from '@games/ui';
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
import { DeckCard, GemPip, NobleTile, SplendorCard, splendorAnimationCssVars } from '@games/splendor/ui';

import { PageBackdrop } from './page-backdrop.js';
import { simulatedNobleState, withReservedPressure } from './splendor-story-helpers.js';

type PrimitiveSnapshot = { readonly stage: 'before' | 'after' };
type PrimitiveObject =
  | { readonly kind: 'chip'; readonly color: 'blue' | 'red' | 'green' | 'white' | 'black' | 'gold' }
  | { readonly kind: 'card' }
  | { readonly kind: 'noble' };

const targets = {
  bank: 'primitive:bank',
  cardFrom: 'primitive:card-from',
  cardTo: 'primitive:card-to',
  chipFrom: 'primitive:chip-from',
  chipTo: 'primitive:chip-to',
  nobleFrom: 'primitive:noble-from',
  nobleTo: 'primitive:noble-to',
  score: 'primitive:score',
} as const;

const PrimitiveSandbox = ({
  createAnimation,
}: {
  readonly createAnimation: () => Animation<PrimitiveSnapshot, PrimitiveObject>;
}) => {
  const [runNonce, setRunNonce] = useState(0);
  const refs = useRef<Partial<Record<string, HTMLElement | null>>>({});
  const beforeSnapshot = useMemo<PrimitiveSnapshot>(() => ({ stage: 'before' }), []);
  const afterSnapshot = useMemo<PrimitiveSnapshot>(() => ({ stage: 'after' }), []);
  const resolveTargetRect = useCallback((targetId: string) => {
    const node = refs.current[targetId];

    if (!node) {
      return null;
    }

    const rect = node.getBoundingClientRect();
    return {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  }, []);
  const frame = useAnimationRunner<PrimitiveSnapshot, PrimitiveObject>({
    canonicalSnapshot: afterSnapshot,
    deriveAnimation: () => createAnimation(),
    initialPresentedSnapshot: beforeSnapshot,
    resetKey: String(runNonce),
    resolveTargetRect,
  });

  const card = withReservedPressure().market.tier1[0]!;
  const noble = simulatedNobleState.nobles[0]!;
  const activeBulges = frame.activeEffects.bulge;
  const scoreFlipping = frame.activeEffects['pulse-number'].has(targets.score);

  return (
    <PageBackdrop>
      <main
        className="min-h-screen px-4 py-8 text-stone-100"
        style={splendorAnimationCssVars as CSSProperties}
      >
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <button
            className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950"
            onClick={() => setRunNonce((current) => current + 1)}
            type="button"
          >
            Replay animation
          </button>

          <section className="rounded-[1rem] border border-white/10 bg-stone-950/72 p-3">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-stone-500">Targets</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span ref={(node) => { refs.current[targets.chipFrom] = node; }}>
                  <GemPip color="blue" count={4} />
                </span>
                <span ref={(node) => { refs.current[targets.chipTo] = node; }}>
                  <GemPip color="blue" count={2} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={activeBulges.has(targets.bank) ? 'receive-bulge' : ''}
                  ref={(node) => { refs.current[targets.bank] = node; }}
                >
                  <GemPip color="red" count={5} />
                </span>
                <p
                  className={`text-3xl font-semibold text-amber-50 ${scoreFlipping ? 'score-flip' : ''}`}
                  ref={(node) => { refs.current[targets.score] = node; }}
                >
                  17
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div ref={(node) => { refs.current[targets.cardFrom] = node; }}>
                  <DeckCard hideCount remainingCount={0} size="compact" tier={2} />
                </div>
                <div ref={(node) => { refs.current[targets.cardTo] = node; }}>
                  <SplendorCard card={card} size="compact" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div ref={(node) => { refs.current[targets.nobleFrom] = node; }}>
                  <NobleTile noble={noble} size="compact" />
                </div>
                <div ref={(node) => { refs.current[targets.nobleTo] = node; }}>
                  <NobleTile noble={noble} size="compact" />
                </div>
              </div>
            </div>
          </section>

          {frame.translations.map((translation, index) => (
            <div
              key={`${translation.from}:${translation.to}:${index}`}
              aria-hidden="true"
              className={`fixed z-50 pointer-events-none ${
                translation.object.kind === 'noble' ? 'noble-flight w-[4.25rem]' : translation.object.kind === 'card' ? 'card-flight w-[4.6rem]' : 'chip-flight'
              }`}
              style={
                {
                  ...(translation.delayMs !== undefined ? { animationDelay: `${translation.delayMs}ms` } : {}),
                  animationDuration: `${translation.durationMs}ms`,
                  left: `${translation.fromX}px`,
                  top: `${translation.fromY}px`,
                  ...(translation.object.kind === 'chip'
                    ? {
                        '--chip-dx': `${translation.toX - translation.fromX}px`,
                        '--chip-dy': `${translation.toY - translation.fromY}px`,
                      }
                    : {
                        '--card-dx': `${translation.toX - translation.fromX}px`,
                        '--card-dy': `${translation.toY - translation.fromY}px`,
                      }),
                } as CSSProperties
              }
            >
              {translation.object.kind === 'chip' ? (
                <GemPip color={translation.object.color} count={1} size="sm" />
              ) : translation.object.kind === 'noble' ? (
                <NobleTile noble={noble} size="compact" />
              ) : (
                <SplendorCard card={card} size="compact" />
              )}
            </div>
          ))}

          {frame.attachedObjects.map((attachedObject, index) => (
            <div
              key={`${attachedObject.effect}:${attachedObject.target}:${index}`}
              aria-hidden="true"
              className={`fixed z-50 pointer-events-none w-[4.6rem] ${
                attachedObject.effect === 'expand'
                  ? 'card-expand-only card-overlay-pose'
                  : attachedObject.effect === 'flip'
                    ? 'card-flip-only card-overlay-pose'
                    : attachedObject.effect === 'hold'
                      ? 'card-hold'
                      : 'card-land card-overlay-pose'
              }`}
              style={{ left: attachedObject.left, top: attachedObject.top } as CSSProperties}
            >
              <SplendorCard card={card} size="compact" />
            </div>
          ))}
        </div>
      </main>
    </PageBackdrop>
  );
};

const meta = {
  component: PrimitiveSandbox,
  title: 'Animation/Primitives',
  args: {
    createAnimation: () =>
      checkpoint<PrimitiveSnapshot, PrimitiveObject>({ stage: 'after' }),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
} satisfies Meta<typeof PrimitiveSandbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TranslateChip: Story = {
  args: {},
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        serial<PrimitiveSnapshot, PrimitiveObject>([
          checkpoint<PrimitiveSnapshot, PrimitiveObject>({ stage: 'before' }),
          translate<PrimitiveSnapshot, PrimitiveObject>({ kind: 'chip', color: 'blue' }, targets.chipFrom, targets.chipTo, {
            durationMs: 1200,
          }),
          checkpoint<PrimitiveSnapshot, PrimitiveObject>({ stage: 'after' }),
        ])
      }
    />
  ),
};

export const BulgeAndScore: Story = {
  args: {},
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        parallel<PrimitiveSnapshot, PrimitiveObject>([
          bulge<PrimitiveSnapshot, PrimitiveObject>(targets.bank, { durationMs: 320 }),
          pulseNumber<PrimitiveSnapshot, PrimitiveObject>(targets.score, { durationMs: 900 }),
        ])
      }
    />
  ),
};

export const FlipCard: Story = {
  args: {},
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        serial<PrimitiveSnapshot, PrimitiveObject>([
          expand<PrimitiveSnapshot, PrimitiveObject>({ kind: 'card' }, targets.cardFrom, { durationMs: 420 }),
          flip<PrimitiveSnapshot, PrimitiveObject>({ kind: 'card' }, targets.cardFrom, { durationMs: 320 }),
          land<PrimitiveSnapshot, PrimitiveObject>({ kind: 'card' }, targets.cardTo, { durationMs: 320 }),
        ])
      }
    />
  ),
};

export const ParallelSequence: Story = {
  args: {},
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        serial<PrimitiveSnapshot, PrimitiveObject>([
          checkpoint<PrimitiveSnapshot, PrimitiveObject>({ stage: 'before' }),
          parallel<PrimitiveSnapshot, PrimitiveObject>([
            translate<PrimitiveSnapshot, PrimitiveObject>({ kind: 'chip', color: 'red' }, targets.chipFrom, targets.chipTo, {
              durationMs: 1200,
            }),
            translate<PrimitiveSnapshot, PrimitiveObject>({ kind: 'noble' }, targets.nobleFrom, targets.nobleTo, {
              durationMs: 1200,
            }),
          ]),
          checkpoint<PrimitiveSnapshot, PrimitiveObject>({ stage: 'after' }),
        ])
      }
    />
  ),
};
