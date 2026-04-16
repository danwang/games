import {
  type Animation,
  type AnimationEffectKind,
  type AnimationTargetId,
  type TimedAnimationOptions,
} from './types.js';

export const serial = <TSnapshot, TObject>(
  animations: readonly Animation<TSnapshot, TObject>[],
): Animation<TSnapshot, TObject> => ({
  type: 'serial',
  animations,
});

export const parallel = <TSnapshot, TObject>(
  animations: readonly Animation<TSnapshot, TObject>[],
): Animation<TSnapshot, TObject> => ({
  type: 'parallel',
  animations,
});

export const wait = <TSnapshot, TObject>(durationMs: number): Animation<TSnapshot, TObject> => ({
  type: 'wait',
  durationMs,
});

export const checkpoint = <TSnapshot, TObject>(snapshot: TSnapshot): Animation<TSnapshot, TObject> => ({
  type: 'checkpoint',
  snapshot,
});

export const translate = <TSnapshot, TObject>(
  object: TObject,
  from: AnimationTargetId,
  to: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => ({
  type: 'translate',
  object,
  from,
  options,
  to,
});

const targetEffect = <TSnapshot, TObject>(
  effect: AnimationEffectKind,
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => ({
  type: 'target-effect',
  effect,
  options,
  target,
});

const attachedEffect = <TSnapshot, TObject>(
  effect: Extract<AnimationEffectKind, 'expand' | 'flip' | 'hold' | 'land'>,
  object: TObject,
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => ({
  type: 'attached-effect',
  effect,
  object,
  options,
  target,
});

export const bulge = <TSnapshot, TObject>(
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => targetEffect('bulge', target, options);

export const highlight = <TSnapshot, TObject>(
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => targetEffect('highlight', target, options);

export const fade = <TSnapshot, TObject>(
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => targetEffect('fade', target, options);

export const pulseNumber = <TSnapshot, TObject>(
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => targetEffect('pulse-number', target, options);

export const expand = <TSnapshot, TObject>(
  object: TObject,
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => attachedEffect('expand', object, target, options);

export const flip = <TSnapshot, TObject>(
  object: TObject,
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => attachedEffect('flip', object, target, options);

export const hold = <TSnapshot, TObject>(
  object: TObject,
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => attachedEffect('hold', object, target, options);

export const land = <TSnapshot, TObject>(
  object: TObject,
  target: AnimationTargetId,
  options: TimedAnimationOptions,
): Animation<TSnapshot, TObject> => attachedEffect('land', object, target, options);
