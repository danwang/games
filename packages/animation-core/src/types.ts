export type AnimationTargetId = string;

export interface ResolvedRect {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

export type AnimationEffectKind =
  | 'bulge'
  | 'expand'
  | 'fade'
  | 'flip'
  | 'highlight'
  | 'hold'
  | 'land'
  | 'pulse-number';

export interface TimedAnimationOptions {
  readonly delayMs?: number;
  readonly durationMs: number;
}

export interface TranslateAnimation<TSnapshot, TObject> {
  readonly type: 'translate';
  readonly object: TObject;
  readonly from: AnimationTargetId;
  readonly to: AnimationTargetId;
  readonly options: TimedAnimationOptions;
}

export interface TargetEffectAnimation<TSnapshot, TObject> {
  readonly type: 'target-effect';
  readonly effect: AnimationEffectKind;
  readonly target: AnimationTargetId;
  readonly options: TimedAnimationOptions;
}

export interface AttachedEffectAnimation<TSnapshot, TObject> {
  readonly type: 'attached-effect';
  readonly effect: Extract<AnimationEffectKind, 'expand' | 'flip' | 'hold' | 'land'>;
  readonly object: TObject;
  readonly target: AnimationTargetId;
  readonly options: TimedAnimationOptions;
}

export interface WaitAnimation<TSnapshot, TObject> {
  readonly type: 'wait';
  readonly durationMs: number;
}

export interface CheckpointAnimation<TSnapshot, TObject> {
  readonly type: 'checkpoint';
  readonly snapshot: TSnapshot;
}

export interface SerialAnimation<TSnapshot, TObject> {
  readonly type: 'serial';
  readonly animations: readonly Animation<TSnapshot, TObject>[];
}

export interface ParallelAnimation<TSnapshot, TObject> {
  readonly type: 'parallel';
  readonly animations: readonly Animation<TSnapshot, TObject>[];
}

export type Animation<TSnapshot, TObject> =
  | TranslateAnimation<TSnapshot, TObject>
  | TargetEffectAnimation<TSnapshot, TObject>
  | AttachedEffectAnimation<TSnapshot, TObject>
  | WaitAnimation<TSnapshot, TObject>
  | CheckpointAnimation<TSnapshot, TObject>
  | SerialAnimation<TSnapshot, TObject>
  | ParallelAnimation<TSnapshot, TObject>;

export interface ResolvedTranslation<TObject> {
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly from: AnimationTargetId;
  readonly fromX: number;
  readonly fromY: number;
  readonly object: TObject;
  readonly to: AnimationTargetId;
  readonly toX: number;
  readonly toY: number;
}

export interface ResolvedAttachedObject<TObject> {
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly effect: Extract<AnimationEffectKind, 'expand' | 'flip' | 'hold' | 'land'>;
  readonly height: number;
  readonly left: number;
  readonly object: TObject;
  readonly target: AnimationTargetId;
  readonly top: number;
  readonly width: number;
}

export type ActiveEffectMap = Readonly<Record<AnimationEffectKind, ReadonlySet<AnimationTargetId>>>;

export interface AnimationFrame<TSnapshot, TObject> {
  readonly activeEffects: ActiveEffectMap;
  readonly attachedObjects: readonly ResolvedAttachedObject<TObject>[];
  readonly isAnimating: boolean;
  readonly presentedSnapshot: TSnapshot | null;
  readonly translations: readonly ResolvedTranslation<TObject>[];
}

export type AnimationTargetResolver = (targetId: AnimationTargetId) => ResolvedRect | null;
