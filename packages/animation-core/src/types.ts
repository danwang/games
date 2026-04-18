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

export interface CloneActorMount {
  readonly from: TargetRef;
  readonly kind: 'clone';
}

export interface DetachedActorMount {
  readonly at: Point | TargetRef;
  readonly kind: 'detached';
}

export type ActorMount = CloneActorMount | DetachedActorMount;

export interface ActorUnmount {
  readonly at: 'end';
  readonly kind: 'remove';
}

export interface WaitStep {
  readonly durationMs: number;
  readonly type: 'wait';
}

export interface HoldStep {
  readonly durationMs: number;
  readonly type: 'hold';
}

export interface PathTargetValue {
  readonly target: TargetRef | 'self';
  readonly x?: number;
  readonly y?: number;
}

export interface PathPointValue {
  readonly left: number;
  readonly top: number;
  readonly type: 'point';
  readonly x?: number;
  readonly y?: number;
}

export type PathValue = PathTargetValue | PathPointValue;

export interface MovePathStep {
  readonly durationMs: number;
  readonly easing?: EasingRef;
  readonly to: PathValue;
  readonly type: 'move';
}

export type PathTrackStep = MovePathStep | WaitStep | HoldStep;

export interface SetValueStep {
  readonly type: 'set';
  readonly value: number;
}

export interface TweenValueStep {
  readonly durationMs: number;
  readonly easing?: EasingRef;
  readonly to: number;
  readonly type: 'tween';
}

export type ValueTrackStep = SetValueStep | TweenValueStep | WaitStep | HoldStep;

export interface ShowFaceStep<TObject> {
  readonly object: TObject;
  readonly type: 'show';
}

export interface FlipFaceStep<TObject> {
  readonly axis?: 'x' | 'y';
  readonly durationMs: number;
  readonly object: TObject;
  readonly type: 'flip';
}

export type FaceTrackStep<TObject> = ShowFaceStep<TObject> | FlipFaceStep<TObject> | WaitStep | HoldStep;

export interface ActorTracks<TObject> {
  readonly face?: readonly FaceTrackStep<TObject>[];
  readonly opacity?: readonly ValueTrackStep[];
  readonly path?: readonly PathTrackStep[];
  readonly rotate?: readonly ValueTrackStep[];
  readonly scale?: readonly ValueTrackStep[];
}

export interface ActorAnimation<TObject> {
  readonly id: string;
  readonly initialOpacity?: number;
  readonly initialRotate?: number;
  readonly initialScale?: number;
  readonly initialX?: number;
  readonly initialY?: number;
  readonly mount: ActorMount;
  readonly object: TObject;
  readonly tracks: ActorTracks<TObject>;
  readonly unmount: ActorUnmount;
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
  readonly actors: readonly ActorAnimation<TObject>[];
  readonly checkpoints: readonly Checkpoint<TSnapshot>[];
  readonly effects: readonly TargetEffectAnimation[];
}

export interface ActorPose {
  readonly opacity: number;
  readonly rotate: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface ResolvedActorFrame<TObject> {
  readonly currentTarget?: AnimationTargetId;
  readonly destinationTarget?: AnimationTargetId;
  readonly height: number;
  readonly id: string;
  readonly left: number;
  readonly nextObject?: TObject;
  readonly object: TObject;
  readonly opacity: number;
  readonly rotate: number;
  readonly scale: number;
  readonly sourceTarget?: AnimationTargetId;
  readonly top: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
  readonly flipAxis?: 'x' | 'y';
  readonly flipProgress?: number;
}

export type ActiveEffectMap = Readonly<Record<TargetEffectKind, ReadonlySet<AnimationTargetId>>>;

export interface AnimationFrame<TSnapshot, TObject> {
  readonly activeEffects: ActiveEffectMap;
  readonly actors: readonly ResolvedActorFrame<TObject>[];
  readonly isAnimating: boolean;
  readonly presentedSnapshot: TSnapshot | null;
}

export type AnimationTargetResolver = (targetId: AnimationTargetId) => ResolvedRect | null;
