import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  actor,
  animation,
  bulge,
  checkpoint,
  clone,
  flipToObject,
  hold,
  moveTo,
  pulseNumber,
  removeAtEnd,
  setValue,
  targetEffect,
  tweenTo,
  wait,
  type Animation,
} from '@games/animation-core';
import { useAnimationRunner } from '@games/ui';
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
import { DeckCard, GemPip, NobleTile, SplendorCard, splendorAnimationCssVars } from '@games/splendor/ui';

import { PageBackdrop } from './page-backdrop.js';
import { simulatedNobleState, withReservedPressure } from './splendor-story-helpers.js';

type PrimitiveSnapshot = { readonly stage: 'before' | 'after' };
type PrimitiveObject =
  | { readonly color: 'blue' | 'red'; readonly kind: 'chip' }
  | { readonly cardId: string; readonly face: 'back' | 'front'; readonly kind: 'card' }
  | { readonly kind: 'noble'; readonly nobleId: string };

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
  const scoreFlipping = frame.activeEffects['pulse-number'].has(targets.score);
  const bankBulging = frame.activeEffects.bulge.has(targets.bank);

  const renderObject = (object: PrimitiveObject) => {
    if (object.kind === 'chip') {
      return <GemPip color={object.color} count={1} size="sm" />;
    }

    if (object.kind === 'noble') {
      return <NobleTile noble={noble} size="compact" />;
    }

    return object.face === 'back' ? (
      <DeckCard hideCount remainingCount={0} size="compact" tier={2} />
    ) : (
      <SplendorCard card={card} size="compact" />
    );
  };

  return (
    <PageBackdrop>
      <main className="min-h-screen px-4 py-8 text-stone-100" style={splendorAnimationCssVars as CSSProperties}>
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
                <span className={bankBulging ? 'receive-bulge' : ''} ref={(node) => { refs.current[targets.bank] = node; }}>
                  <GemPip color="red" count={5} />
                </span>
                <p className={`text-3xl font-semibold text-amber-50 ${scoreFlipping ? 'score-flip' : ''}`} ref={(node) => { refs.current[targets.score] = node; }}>
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

          {frame.actors.map((actorFrame) => (
            <div
              key={actorFrame.id}
              aria-hidden="true"
              className="fixed z-50 pointer-events-none"
              style={
                {
                  left: `${actorFrame.left}px`,
                  opacity: actorFrame.opacity,
                  top: `${actorFrame.top}px`,
                  transform: `translate3d(${actorFrame.x}px, ${actorFrame.y}px, 0) scale(${actorFrame.scale}) rotate(${actorFrame.rotate}deg)`,
                  width: `${actorFrame.width}px`,
                } as CSSProperties
              }
            >
              {actorFrame.flipProgress !== undefined &&
              actorFrame.object.kind === 'card' &&
              actorFrame.nextObject?.kind === 'card' ? (
                <div className="relative aspect-[5/7] w-full" style={{ perspective: '1000px' }}>
                  <div
                    className="relative h-full w-full"
                    style={{
                      transform: `rotateY(${actorFrame.flipProgress * 180}deg)`,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div className="card-flight-face absolute inset-0">
                      {renderObject(actorFrame.object)}
                    </div>
                    <div className="card-flight-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
                      {renderObject(actorFrame.nextObject)}
                    </div>
                  </div>
                </div>
              ) : (
                renderObject(actorFrame.object)
              )}
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
    createAnimation: () => animation<PrimitiveSnapshot, PrimitiveObject>({ checkpoints: [checkpoint(0, { stage: 'after' })] }),
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
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        animation<PrimitiveSnapshot, PrimitiveObject>({
          checkpoints: [
            checkpoint(0, { stage: 'before' }),
            checkpoint(1200, { stage: 'after' }),
          ],
          actors: [
            actor({
              id: 'chip:blue:0',
              mount: clone(targets.chipFrom),
              object: { color: 'blue', kind: 'chip' },
              tracks: {
                opacity: [setValue(0), tweenTo(1, { durationMs: 120 }), hold(990), tweenTo(0, { durationMs: 90 })],
                path: [moveTo(targets.chipTo, { durationMs: 1200, easing: 'chip-flight' })],
                scale: [setValue(0.72), tweenTo(1.02, { durationMs: 1200, easing: 'chip-flight' })],
              },
              unmount: removeAtEnd(),
            }),
          ],
        })
      }
    />
  ),
};

export const BulgeAndScore: Story = {
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        animation<PrimitiveSnapshot, PrimitiveObject>({
          effects: [
            targetEffect(targets.bank, [bulge(320)]),
            targetEffect(targets.score, [pulseNumber(900)]),
          ],
        })
      }
    />
  ),
};

export const FlipCard: Story = {
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        animation<PrimitiveSnapshot, PrimitiveObject>({
          checkpoints: [
            checkpoint(0, { stage: 'before' }),
            checkpoint(1060, { stage: 'after' }),
          ],
          actors: [
            actor({
              id: 'card:demo',
              mount: clone(targets.cardFrom),
              object: { cardId: 'demo', face: 'back', kind: 'card' } as PrimitiveObject,
              tracks: {
                face: [
                  wait(420),
                  flipToObject(
                    { cardId: 'demo', face: 'front', kind: 'card' } as PrimitiveObject,
                    { durationMs: 320 },
                  ),
                ],
                path: [
                  moveTo('self', { durationMs: 420, y: -8 }),
                  hold(320),
                  moveTo(targets.cardTo, { durationMs: 320, y: 0 }),
                ],
              },
              unmount: removeAtEnd(),
            }),
          ],
        })
      }
    />
  ),
};

export const ParallelSequence: Story = {
  render: () => (
    <PrimitiveSandbox
      createAnimation={() =>
        animation<PrimitiveSnapshot, PrimitiveObject>({
          checkpoints: [
            checkpoint(0, { stage: 'before' }),
            checkpoint(1200, { stage: 'after' }),
          ],
          actors: [
            actor({
              id: 'chip:red:0',
              mount: clone(targets.chipFrom),
              object: { color: 'red', kind: 'chip' },
              tracks: {
                opacity: [setValue(0), tweenTo(1, { durationMs: 120 }), hold(990), tweenTo(0, { durationMs: 90 })],
                path: [moveTo(targets.chipTo, { durationMs: 1200, easing: 'chip-flight' })],
                scale: [setValue(0.72), tweenTo(1.02, { durationMs: 1200, easing: 'chip-flight' })],
              },
              unmount: removeAtEnd(),
            }),
            actor({
              id: 'noble:demo',
              mount: clone(targets.nobleFrom),
              object: { kind: 'noble', nobleId: simulatedNobleState.nobles[0]!.id },
              tracks: {
                path: [moveTo(targets.nobleTo, { durationMs: 1200, easing: 'flight' })],
                scale: [tweenTo(0.94, { durationMs: 1200, easing: 'flight' })],
              },
              unmount: removeAtEnd(),
            }),
          ],
        })
      }
    />
  ),
};
