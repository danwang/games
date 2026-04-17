import {
  type Animation,
  type Checkpoint,
  type OverlayAnimation,
  type OverlayMount,
  type OverlayStep,
  type OverlayUnmount,
  type Point,
  type TargetEffectAnimation,
  type TargetEffectStep,
  type TargetRef,
} from './types.js';

export const animation = <TSnapshot, TObject>({
  checkpoints = [],
  effects = [],
  overlays = [],
}: {
  readonly checkpoints?: readonly Checkpoint<TSnapshot>[];
  readonly effects?: readonly TargetEffectAnimation[];
  readonly overlays?: readonly OverlayAnimation<TObject>[];
}): Animation<TSnapshot, TObject> => ({
  checkpoints,
  effects,
  overlays,
});

export const checkpoint = <TSnapshot>(atMs: number, snapshot: TSnapshot): Checkpoint<TSnapshot> => ({
  atMs,
  snapshot,
});

export const clone = (from: TargetRef): OverlayMount => ({
  from,
  kind: 'clone',
});

export const detached = (at: Point | TargetRef): OverlayMount => ({
  at,
  kind: 'detached',
});

export const removeAtEnd = (): OverlayUnmount => ({
  at: 'end',
  kind: 'remove',
});

export const overlay = <TObject>(config: OverlayAnimation<TObject>): OverlayAnimation<TObject> => config;

export const to = <TObject>(
  destination: TargetRef | 'self',
  options: Omit<Extract<OverlayStep<TObject>, { readonly type: 'to' }>, 'to' | 'type'>,
): OverlayStep<TObject> => ({
  ...options,
  to: destination,
  type: 'to',
});

export const hold = <TObject>(durationMs: number): OverlayStep<TObject> => ({
  durationMs,
  type: 'hold',
});

export const flipTo = <TObject>(
  object: TObject,
  options: Omit<Extract<OverlayStep<TObject>, { readonly type: 'flipTo' }>, 'object' | 'type'>,
): OverlayStep<TObject> => ({
  ...options,
  object,
  type: 'flipTo',
});

export const fadeTo = <TObject>(
  opacity: number,
  options: Omit<Extract<OverlayStep<TObject>, { readonly type: 'fadeTo' }>, 'opacity' | 'type'>,
): OverlayStep<TObject> => ({
  ...options,
  opacity,
  type: 'fadeTo',
});

export const wait = <TObject>(durationMs: number): OverlayStep<TObject> => ({
  durationMs,
  type: 'wait',
});

export const sequence = <TObject>(steps: readonly OverlayStep<TObject>[]): OverlayStep<TObject> => ({
  steps,
  type: 'sequence',
});

export const parallel = <TObject>(steps: readonly OverlayStep<TObject>[]): OverlayStep<TObject> => ({
  steps,
  type: 'parallel',
});

export const targetEffect = (
  target: TargetRef,
  steps: readonly TargetEffectStep[],
): TargetEffectAnimation => ({
  steps,
  target,
});

export const bulge = (durationMs: number): TargetEffectStep => ({
  durationMs,
  type: 'bulge',
});

export const fade = (durationMs: number): TargetEffectStep => ({
  durationMs,
  type: 'fade',
});

export const highlight = (durationMs: number): TargetEffectStep => ({
  durationMs,
  type: 'highlight',
});

export const pulseNumber = (durationMs: number): TargetEffectStep => ({
  durationMs,
  type: 'pulse-number',
});

export const reveal = (durationMs: number): TargetEffectStep => ({
  durationMs,
  type: 'reveal',
});

export const effectWait = (durationMs: number): TargetEffectStep => ({
  durationMs,
  type: 'wait',
});

export const effectSequence = (steps: readonly TargetEffectStep[]): TargetEffectStep => ({
  steps,
  type: 'sequence',
});

export const effectParallel = (steps: readonly TargetEffectStep[]): TargetEffectStep => ({
  steps,
  type: 'parallel',
});
