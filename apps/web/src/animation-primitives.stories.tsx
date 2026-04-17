import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  animation,
  bulge,
  checkpoint,
  clone,
  flipTo,
  hold,
  overlay,
  pulseNumber,
  removeAtEnd,
  sequence,
  targetEffect,
  to,
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

          {frame.overlays.map((overlay) => (
            <div
              key={overlay.id}
              aria-hidden="true"
              className={`fixed z-50 pointer-events-none ${
                overlay.object.kind === 'noble'
                  ? overlay.phase === 'to'
                    ? 'noble-flight w-[4.25rem]'
                    : 'w-[4.25rem]'
                  : overlay.object.kind === 'card'
                    ? overlay.phase === 'to'
                      ? 'card-flight w-[4.6rem]'
                      : overlay.phase === 'flipTo'
                        ? 'card-flip-only card-overlay-pose w-[4.6rem]'
                        : 'card-hold w-[4.6rem]'
                    : 'chip-flight'
              }`}
              style={
                (overlay.object.kind === 'chip'
                  ? {
                      animationDuration: `${overlay.durationMs}ms`,
                      left: `${overlay.startLeft}px`,
                      top: `${overlay.startTop}px`,
                      '--chip-dx': `${overlay.endLeft - overlay.startLeft}px`,
                      '--chip-dy': `${overlay.endTop - overlay.startTop}px`,
                    }
                  : overlay.phase === 'to'
                    ? {
                        animationDuration: `${overlay.durationMs}ms`,
                        left: `${overlay.startLeft}px`,
                        top: `${overlay.startTop}px`,
                        '--card-dx': `${overlay.endLeft - overlay.startLeft + (overlay.endPose.x - overlay.startPose.x)}px`,
                        '--card-dy': `${overlay.endTop - overlay.startTop + (overlay.endPose.y - overlay.startPose.y)}px`,
                        '--overlay-from-opacity': overlay.startPose.opacity,
                        '--overlay-from-rotate': overlay.startPose.rotate,
                        '--overlay-from-scale': overlay.startPose.scale,
                        '--overlay-to-opacity': overlay.endPose.opacity,
                        '--overlay-to-rotate': overlay.endPose.rotate,
                        '--overlay-to-scale': overlay.endPose.scale,
                      }
                    : {
                        animationDuration: `${overlay.durationMs}ms`,
                        left: `${overlay.endLeft}px`,
                        top: `${overlay.endTop}px`,
                        opacity: overlay.endPose.opacity,
                        transform: `translate3d(${overlay.endPose.x}px, ${overlay.endPose.y}px, 0) scale(${overlay.endPose.scale}) rotate(${overlay.endPose.rotate}deg)`,
                      }) as CSSProperties
              }
            >
              {overlay.phase === 'flipTo' && overlay.object.kind === 'card' && overlay.nextObject?.kind === 'card' ? (
                <div className="card-flip-only-inner relative aspect-[5/7] w-full">
                  <div className="card-flight-face absolute inset-0">
                    {renderObject(overlay.object)}
                  </div>
                  <div className="card-flight-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
                    {renderObject(overlay.nextObject)}
                  </div>
                </div>
              ) : (
                renderObject(overlay.object)
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
          overlays: [
            overlay({
              id: 'chip:blue:0',
              mount: clone(targets.chipFrom),
              object: { color: 'blue', kind: 'chip' },
              steps: [to(targets.chipTo, { durationMs: 1200, easing: 'flight' })],
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
          overlays: [
            overlay({
              id: 'card:demo',
              mount: clone(targets.cardFrom),
              object: { cardId: 'demo', face: 'back', kind: 'card' },
              steps: [
                sequence([
                  to('self', { durationMs: 420, scale: 1, y: -8 }),
                  flipTo({ cardId: 'demo', face: 'front', kind: 'card' }, { durationMs: 320 }),
                  to(targets.cardTo, { durationMs: 320, rotate: 0, scale: 1, y: 0 }),
                ]),
              ],
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
          overlays: [
            overlay({
              id: 'chip:red:0',
              mount: clone(targets.chipFrom),
              object: { color: 'red', kind: 'chip' },
              steps: [to(targets.chipTo, { durationMs: 1200, easing: 'flight' })],
              unmount: removeAtEnd(),
            }),
            overlay({
              id: 'noble:demo',
              mount: clone(targets.nobleFrom),
              object: { kind: 'noble', nobleId: simulatedNobleState.nobles[0]!.id },
              steps: [to(targets.nobleTo, { durationMs: 1200, easing: 'flight', scale: 0.94 })],
              unmount: removeAtEnd(),
            }),
          ],
        })
      }
    />
  ),
};
