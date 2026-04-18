import {
  type ActorAnimation,
  type ActorMount,
  type ActorUnmount,
  type Animation,
  type Checkpoint,
  type FaceTrackStep,
  type PathTrackStep,
  type PathValue,
  type Point,
  type TargetEffectAnimation,
  type TargetEffectStep,
  type TargetRef,
  type ValueTrackStep,
} from './types.js';

export const animation = <TSnapshot, TObject>({
  actors = [],
  checkpoints = [],
  effects = [],
}: {
  readonly actors?: readonly ActorAnimation<TObject>[];
  readonly checkpoints?: readonly Checkpoint<TSnapshot>[];
  readonly effects?: readonly TargetEffectAnimation[];
}): Animation<TSnapshot, TObject> => ({
  actors,
  checkpoints,
  effects,
});

export const checkpoint = <TSnapshot>(atMs: number, snapshot: TSnapshot): Checkpoint<TSnapshot> => ({
  atMs,
  snapshot,
});

export const clone = (from: TargetRef): ActorMount => ({
  from,
  kind: 'clone',
});

export const detached = (at: Point | TargetRef): ActorMount => ({
  at,
  kind: 'detached',
});

export const removeAtEnd = (): ActorUnmount => ({
  at: 'end',
  kind: 'remove',
});

export const actor = <TObject>(config: ActorAnimation<TObject>): ActorAnimation<TObject> => config;

export const moveTo = (
  destination: TargetRef | 'self',
  options: Omit<Extract<PathTrackStep, { readonly type: 'move' }>, 'to' | 'type'> & {
    readonly x?: number;
    readonly y?: number;
  },
): PathTrackStep => ({
  ...options,
  to: {
    target: destination,
    ...(options.x !== undefined ? { x: options.x } : {}),
    ...(options.y !== undefined ? { y: options.y } : {}),
  },
  type: 'move',
});

export const moveToPoint = (
  point: Point,
  options: Omit<Extract<PathTrackStep, { readonly type: 'move' }>, 'to' | 'type'> & {
    readonly x?: number;
    readonly y?: number;
  },
): PathTrackStep => ({
  ...options,
  to: {
    left: point.left,
    top: point.top,
    type: 'point',
    ...(options.x !== undefined ? { x: options.x } : {}),
    ...(options.y !== undefined ? { y: options.y } : {}),
  } satisfies PathValue,
  type: 'move',
});

export const trackWait = (durationMs: number): PathTrackStep & ValueTrackStep & FaceTrackStep<never> => ({
  durationMs,
  type: 'wait',
});

export const trackHold = (durationMs: number): PathTrackStep & ValueTrackStep & FaceTrackStep<never> => ({
  durationMs,
  type: 'hold',
});

export const wait = trackWait;
export const hold = trackHold;

export const setValue = (value: number): ValueTrackStep => ({
  type: 'set',
  value,
});

export const tweenTo = (
  to: number,
  options: Omit<Extract<ValueTrackStep, { readonly type: 'tween' }>, 'to' | 'type'>,
): ValueTrackStep => ({
  ...options,
  to,
  type: 'tween',
});

export const showObject = <TObject>(object: TObject): FaceTrackStep<TObject> => ({
  object,
  type: 'show',
});

export const flipToObject = <TObject>(
  object: TObject,
  options: Omit<Extract<FaceTrackStep<TObject>, { readonly type: 'flip' }>, 'object' | 'type'>,
): FaceTrackStep<TObject> => ({
  ...options,
  object,
  type: 'flip',
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
