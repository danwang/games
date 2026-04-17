export type AnimationTargetId = string;
export type TargetRef = AnimationTargetId;
export type EasingRef = string;

export interface Point {
  readonly left: number;
  readonly top: number;
}

export interface ResolvedRect {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

export interface Checkpoint<TSnapshot> {
  readonly atMs: number;
  readonly snapshot: TSnapshot;
}

export interface CloneOverlayMount {
  readonly from: TargetRef;
  readonly kind: 'clone';
}

export interface DetachedOverlayMount {
  readonly at: Point | TargetRef;
  readonly kind: 'detached';
}

export type OverlayMount = CloneOverlayMount | DetachedOverlayMount;

export interface OverlayUnmount {
  readonly at: 'end';
  readonly kind: 'remove';
}

export interface OverlayToStep {
  readonly durationMs: number;
  readonly easing?: EasingRef;
  readonly opacity?: number;
  readonly rotate?: number;
  readonly scale?: number;
  readonly to: TargetRef | 'self';
  readonly type: 'to';
  readonly x?: number;
  readonly y?: number;
}

export interface OverlayHoldStep {
  readonly durationMs: number;
  readonly type: 'hold';
}

export interface OverlayFlipToStep<TObject> {
  readonly axis?: 'x' | 'y';
  readonly durationMs: number;
  readonly object: TObject;
  readonly type: 'flipTo';
}

export interface OverlayFadeToStep {
  readonly durationMs: number;
  readonly opacity: number;
  readonly rotate?: number;
  readonly scale?: number;
  readonly type: 'fadeTo';
  readonly x?: number;
  readonly y?: number;
}

export interface OverlayWaitStep {
  readonly durationMs: number;
  readonly type: 'wait';
}

export interface OverlaySequenceStep<TObject> {
  readonly steps: readonly OverlayStep<TObject>[];
  readonly type: 'sequence';
}

export interface OverlayParallelStep<TObject> {
  readonly steps: readonly OverlayStep<TObject>[];
  readonly type: 'parallel';
}

export type OverlayStep<TObject> =
  | OverlayToStep
  | OverlayHoldStep
  | OverlayFlipToStep<TObject>
  | OverlayFadeToStep
  | OverlayWaitStep
  | OverlaySequenceStep<TObject>
  | OverlayParallelStep<TObject>;

export interface OverlayAnimation<TObject> {
  readonly id: string;
  readonly initialPose?: Partial<OverlayPose>;
  readonly mount: OverlayMount;
  readonly object: TObject;
  readonly steps: readonly OverlayStep<TObject>[];
  readonly unmount: OverlayUnmount;
}

export type TargetEffectKind = 'bulge' | 'fade' | 'highlight' | 'pulse-number' | 'reveal';

export interface TargetBulgeStep {
  readonly durationMs: number;
  readonly type: 'bulge';
}

export interface TargetFadeStep {
  readonly durationMs: number;
  readonly type: 'fade';
}

export interface TargetHighlightStep {
  readonly durationMs: number;
  readonly type: 'highlight';
}

export interface TargetPulseNumberStep {
  readonly durationMs: number;
  readonly type: 'pulse-number';
}

export interface TargetRevealStep {
  readonly durationMs: number;
  readonly type: 'reveal';
}

export interface TargetWaitStep {
  readonly durationMs: number;
  readonly type: 'wait';
}

export interface TargetSequenceStep {
  readonly steps: readonly TargetEffectStep[];
  readonly type: 'sequence';
}

export interface TargetParallelStep {
  readonly steps: readonly TargetEffectStep[];
  readonly type: 'parallel';
}

export type TargetEffectStep =
  | TargetBulgeStep
  | TargetFadeStep
  | TargetHighlightStep
  | TargetPulseNumberStep
  | TargetRevealStep
  | TargetWaitStep
  | TargetSequenceStep
  | TargetParallelStep;

export interface TargetEffectAnimation {
  readonly steps: readonly TargetEffectStep[];
  readonly target: TargetRef;
}

export interface Animation<TSnapshot, TObject> {
  readonly checkpoints: readonly Checkpoint<TSnapshot>[];
  readonly effects: readonly TargetEffectAnimation[];
  readonly overlays: readonly OverlayAnimation<TObject>[];
}

export interface OverlayPose {
  readonly opacity: number;
  readonly rotate: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export type ResolvedOverlayPhase = 'fadeTo' | 'flipTo' | 'hold' | 'to';

export interface ResolvedOverlayActor<TObject> {
  readonly durationMs: number;
  readonly endLeft: number;
  readonly endPose: OverlayPose;
  readonly endTop: number;
  readonly height: number;
  readonly id: string;
  readonly nextObject?: TObject;
  readonly object: TObject;
  readonly phase: ResolvedOverlayPhase;
  readonly sourceTarget?: AnimationTargetId;
  readonly startLeft: number;
  readonly startPose: OverlayPose;
  readonly startTop: number;
  readonly width: number;
}

export type ActiveEffectMap = Readonly<Record<TargetEffectKind, ReadonlySet<AnimationTargetId>>>;

export interface AnimationFrame<TSnapshot, TObject> {
  readonly activeEffects: ActiveEffectMap;
  readonly isAnimating: boolean;
  readonly overlays: readonly ResolvedOverlayActor<TObject>[];
  readonly presentedSnapshot: TSnapshot | null;
}

export type AnimationTargetResolver = (targetId: AnimationTargetId) => ResolvedRect | null;
