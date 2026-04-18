import {
  type ActorAnimation,
  type ActorMount,
  type ActorPose,
  type ActiveEffectMap,
  type Animation,
  type AnimationFrame,
  type AnimationTargetId,
  type AnimationTargetResolver,
  type FaceTrackStep,
  type PathTrackStep,
  type PathValue,
  type ResolvedActorFrame,
  type ResolvedRect,
  type TargetEffectKind,
  type TargetEffectStep,
  type ValueTrackStep,
} from './types.js';

type MutableEffectMap = Record<TargetEffectKind, Set<AnimationTargetId>>;

interface AnchorTarget {
  readonly kind: 'target';
  readonly target: AnimationTargetId;
}

interface AnchorStatic {
  readonly height: number;
  readonly kind: 'static';
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

type Anchor = AnchorTarget | AnchorStatic;

interface PathState {
  readonly anchor: Anchor;
  readonly x: number;
  readonly y: number;
}

interface PathInterval {
  readonly durationMs: number;
  readonly easing?: string;
  readonly end: PathState;
  readonly start: PathState;
  readonly startMs: number;
}

interface ScalarInterval {
  readonly durationMs: number;
  readonly easing?: string;
  readonly end: number;
  readonly start: number;
  readonly startMs: number;
}

interface FaceInterval<TObject> {
  readonly axis: 'x' | 'y';
  readonly durationMs: number;
  readonly endObject: TObject;
  readonly startMs: number;
  readonly startObject: TObject;
}

interface CompiledActor<TObject> {
  readonly durationMs: number;
  readonly faceIntervals: readonly FaceInterval<TObject>[];
  readonly id: string;
  readonly initialFace: TObject;
  readonly mountTarget?: AnimationTargetId;
  readonly initialOpacity: number;
  readonly initialRotate: number;
  readonly initialScale: number;
  readonly mountRect: ResolvedRect;
  readonly opacityIntervals: readonly ScalarInterval[];
  readonly pathInitial: PathState;
  readonly pathIntervals: readonly PathInterval[];
  readonly rotateIntervals: readonly ScalarInterval[];
  readonly scaleIntervals: readonly ScalarInterval[];
  readonly sourceTarget?: AnimationTargetId;
}

interface TargetEffectEvent {
  readonly durationMs: number;
  readonly effect: TargetEffectKind;
  readonly startMs: number;
  readonly target: AnimationTargetId;
}

export interface CompiledAnimation<TSnapshot, TObject> {
  readonly actors: readonly CompiledActor<TObject>[];
  readonly checkpoints: readonly { readonly atMs: number; readonly snapshot: TSnapshot }[];
  readonly effects: readonly TargetEffectEvent[];
  readonly finalSnapshot: TSnapshot | null;
  readonly totalDurationMs: number;
}

const defaultPose: ActorPose = {
  opacity: 1,
  rotate: 0,
  scale: 1,
  x: 0,
  y: 0,
};

const createEmptyEffects = (): MutableEffectMap => ({
  bulge: new Set(),
  fade: new Set(),
  highlight: new Set(),
  'pulse-number': new Set(),
  reveal: new Set(),
});

const latestCheckpoint = <TSnapshot>(
  checkpoints: readonly { readonly atMs: number; readonly snapshot: TSnapshot }[],
  timeMs: number,
  fallbackSnapshot: TSnapshot | null,
): TSnapshot | null =>
  checkpoints
    .filter((entry) => entry.atMs <= timeMs)
    .sort((left, right) => right.atMs - left.atMs)[0]?.snapshot ?? fallbackSnapshot;

const resolveStaticRect = (point: { readonly left: number; readonly top: number }): ResolvedRect => ({
  height: 0,
  left: point.left,
  top: point.top,
  width: 0,
});

const resolveAnchor = (
  anchor: Anchor,
  resolveTargetRect: AnimationTargetResolver,
): ResolvedRect | null =>
  anchor.kind === 'target'
    ? resolveTargetRect(anchor.target)
    : {
        height: anchor.height,
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
      };

const resolveMount = (
  mount: ActorMount,
  resolveTargetRect: AnimationTargetResolver,
): Anchor | null => {
  if (mount.kind === 'clone') {
    return { kind: 'target', target: mount.from };
  }

  if (typeof mount.at === 'string') {
    return { kind: 'target', target: mount.at };
  }

  const rect = resolveStaticRect(mount.at);
  return {
    height: rect.height,
    kind: 'static',
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};

const isPointPathValue = (value: PathValue): value is Extract<PathValue, { readonly type: 'point' }> =>
  'type' in value && value.type === 'point';

const resolvePathValue = (value: PathValue, current: PathState): PathState => {
  if (isPointPathValue(value)) {
    return {
      anchor: {
        height: 0,
        kind: 'static',
        left: value.left,
        top: value.top,
        width: 0,
      },
      x: value.x ?? current.x,
      y: value.y ?? current.y,
    };
  }

  const targetValue = value;
  return {
    anchor:
      targetValue.target === 'self'
        ? current.anchor
        : {
            kind: 'target',
            target: targetValue.target,
          },
    x: targetValue.x ?? current.x,
    y: targetValue.y ?? current.y,
  };
};

const compilePathTrack = (
  steps: readonly PathTrackStep[] | undefined,
  initial: PathState,
): { readonly durationMs: number; readonly intervals: readonly PathInterval[] } => {
  if (!steps || steps.length === 0) {
    return { durationMs: 0, intervals: [] };
  }

  let cursor = 0;
  let current = initial;
  const intervals: PathInterval[] = [];

  for (const step of steps) {
    if (step.type === 'wait' || step.type === 'hold') {
      cursor += step.durationMs;
      continue;
    }

    const next = resolvePathValue(step.to, current);
    intervals.push({
      durationMs: step.durationMs,
      ...(step.easing !== undefined ? { easing: step.easing } : {}),
      end: next,
      start: current,
      startMs: cursor,
    });
    current = next;
    cursor += step.durationMs;
  }

  return { durationMs: cursor, intervals };
};

const compileValueTrack = (
  steps: readonly ValueTrackStep[] | undefined,
  initial: number,
): { readonly durationMs: number; readonly intervals: readonly ScalarInterval[] } => {
  if (!steps || steps.length === 0) {
    return { durationMs: 0, intervals: [] };
  }

  let cursor = 0;
  let current = initial;
  const intervals: ScalarInterval[] = [];

  for (const step of steps) {
    if (step.type === 'wait' || step.type === 'hold') {
      cursor += step.durationMs;
      continue;
    }

    if (step.type === 'set') {
      current = step.value;
      continue;
    }

    intervals.push({
      durationMs: step.durationMs,
      ...(step.easing !== undefined ? { easing: step.easing } : {}),
      end: step.to,
      start: current,
      startMs: cursor,
    });
    current = step.to;
    cursor += step.durationMs;
  }

  return { durationMs: cursor, intervals };
};

const compileFaceTrack = <TObject>(
  steps: readonly FaceTrackStep<TObject>[] | undefined,
  initial: TObject,
): { readonly durationMs: number; readonly intervals: readonly FaceInterval<TObject>[] } => {
  if (!steps || steps.length === 0) {
    return { durationMs: 0, intervals: [] };
  }

  let cursor = 0;
  let current = initial;
  const intervals: FaceInterval<TObject>[] = [];

  for (const step of steps) {
    if (step.type === 'wait' || step.type === 'hold') {
      cursor += step.durationMs;
      continue;
    }

    if (step.type === 'show') {
      current = step.object;
      continue;
    }

    intervals.push({
      axis: step.axis ?? 'y',
      durationMs: step.durationMs,
      endObject: step.object,
      startMs: cursor,
      startObject: current,
    });
    current = step.object;
    cursor += step.durationMs;
  }

  return { durationMs: cursor, intervals };
};

const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number, x: number): number => {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let t = x;
  for (let index = 0; index < 8; index += 1) {
    const xEstimate = sampleX(t) - x;
    if (Math.abs(xEstimate) < 1e-6) {
      return sampleY(t);
    }
    const derivative = sampleDerivativeX(t);
    if (Math.abs(derivative) < 1e-6) {
      break;
    }
    t -= xEstimate / derivative;
  }

  let lower = 0;
  let upper = 1;
  t = x;
  while (lower < upper) {
    const xEstimate = sampleX(t);
    if (Math.abs(xEstimate - x) < 1e-6) {
      return sampleY(t);
    }
    if (x > xEstimate) {
      lower = t;
    } else {
      upper = t;
    }
    t = (upper - lower) * 0.5 + lower;
  }

  return sampleY(t);
};

const applyEasing = (progress: number, easing?: string): number => {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }
  if (!easing || easing === 'linear') {
    return progress;
  }
  if (easing === 'flight') {
    return cubicBezier(0.16, 0.84, 0.24, 1, progress);
  }
  if (easing === 'chip-flight') {
    return cubicBezier(0.18, 0.82, 0.42, 1, progress);
  }
  return progress;
};

const lerp = (start: number, end: number, progress: number): number => start + (end - start) * progress;

const sampleScalarTrack = (intervals: readonly ScalarInterval[], initial: number, timeMs: number): number => {
  let current = initial;
  for (const interval of intervals) {
    if (timeMs < interval.startMs) {
      break;
    }
    if (timeMs >= interval.startMs + interval.durationMs) {
      current = interval.end;
      continue;
    }
    return lerp(
      interval.start,
      interval.end,
      applyEasing((timeMs - interval.startMs) / interval.durationMs, interval.easing),
    );
  }
  return current;
};

interface SampledPathState {
  readonly currentTarget?: AnimationTargetId;
  readonly destinationTarget?: AnimationTargetId;
  readonly inFlight: boolean;
  readonly progress: number;
  readonly start: PathState;
  readonly end: PathState;
}

const samplePathTrack = (
  intervals: readonly PathInterval[],
  initial: PathState,
  timeMs: number,
): SampledPathState => {
  let current = initial;
  let currentTarget = current.anchor.kind === 'target' ? current.anchor.target : undefined;

  for (const interval of intervals) {
    if (timeMs < interval.startMs) {
      break;
    }

    if (timeMs >= interval.startMs + interval.durationMs) {
      current = interval.end;
      currentTarget = current.anchor.kind === 'target' ? current.anchor.target : undefined;
      continue;
    }

    return {
      ...(currentTarget !== undefined ? { currentTarget } : {}),
      ...(interval.end.anchor.kind === 'target' ? { destinationTarget: interval.end.anchor.target } : {}),
      end: interval.end,
      inFlight: true,
      progress: applyEasing((timeMs - interval.startMs) / interval.durationMs, interval.easing),
      start: interval.start,
    };
  }

  return {
    ...(currentTarget !== undefined ? { currentTarget } : {}),
    ...(current.anchor.kind === 'target' ? { destinationTarget: current.anchor.target } : {}),
    end: current,
    inFlight: false,
    progress: 1,
    start: current,
  };
};

const sampleFaceTrack = <TObject>(
  intervals: readonly FaceInterval<TObject>[],
  initial: TObject,
  timeMs: number,
): { readonly flipAxis?: 'x' | 'y'; readonly flipProgress?: number; readonly nextObject?: TObject; readonly object: TObject } => {
  let current = initial;
  for (const interval of intervals) {
    if (timeMs < interval.startMs) {
      break;
    }
    if (timeMs >= interval.startMs + interval.durationMs) {
      current = interval.endObject;
      continue;
    }
    return {
      flipAxis: interval.axis,
      flipProgress: (timeMs - interval.startMs) / interval.durationMs,
      nextObject: interval.endObject,
      object: interval.startObject,
    };
  }
  return { object: current };
};

const compileTargetEffectSteps = (
  steps: readonly TargetEffectStep[],
  startMs: number,
  target: AnimationTargetId,
): { readonly durationMs: number; readonly events: readonly TargetEffectEvent[] } => {
  const compileStep = (
    step: TargetEffectStep,
    offsetMs: number,
  ): { readonly durationMs: number; readonly events: readonly TargetEffectEvent[] } => {
    switch (step.type) {
      case 'wait':
        return { durationMs: step.durationMs, events: [] };
      case 'bulge':
      case 'fade':
      case 'highlight':
      case 'pulse-number':
      case 'reveal':
        return {
          durationMs: step.durationMs,
          events: [{ durationMs: step.durationMs, effect: step.type, startMs: offsetMs, target }],
        };
      case 'sequence': {
        let cursor = offsetMs;
        const events: TargetEffectEvent[] = [];
        for (const child of step.steps) {
          const compiled = compileStep(child, cursor);
          cursor += compiled.durationMs;
          events.push(...compiled.events);
        }
        return { durationMs: cursor - offsetMs, events };
      }
      case 'parallel': {
        const compiledChildren = step.steps.map((child) => compileStep(child, offsetMs));
        return {
          durationMs: compiledChildren.reduce((max, child) => Math.max(max, child.durationMs), 0),
          events: compiledChildren.flatMap((child) => child.events),
        };
      }
    }
  };

  let cursor = startMs;
  const events: TargetEffectEvent[] = [];
  for (const step of steps) {
    const compiled = compileStep(step, cursor);
    cursor += compiled.durationMs;
    events.push(...compiled.events);
  }
  return { durationMs: cursor - startMs, events };
};

const compileActor = <TObject>(
  definition: ActorAnimation<TObject>,
  resolveTargetRect: AnimationTargetResolver,
): CompiledActor<TObject> | null => {
  const mountAnchor = resolveMount(definition.mount, resolveTargetRect);
  if (!mountAnchor) {
    return null;
  }
  const mountRect = resolveAnchor(mountAnchor, resolveTargetRect);
  if (!mountRect) {
    return null;
  }

  const pathInitial: PathState = {
    anchor: mountAnchor,
    x: definition.initialX ?? defaultPose.x,
    y: definition.initialY ?? defaultPose.y,
  };
  const path = compilePathTrack(definition.tracks.path, pathInitial);
  const scale = compileValueTrack(definition.tracks.scale, definition.initialScale ?? defaultPose.scale);
  const rotate = compileValueTrack(definition.tracks.rotate, definition.initialRotate ?? defaultPose.rotate);
  const opacity = compileValueTrack(definition.tracks.opacity, definition.initialOpacity ?? defaultPose.opacity);
  const face = compileFaceTrack(definition.tracks.face, definition.object);

  return {
    durationMs: Math.max(path.durationMs, scale.durationMs, rotate.durationMs, opacity.durationMs, face.durationMs),
    faceIntervals: face.intervals,
    id: definition.id,
    initialFace: definition.object,
    ...(mountAnchor.kind === 'target' ? { mountTarget: mountAnchor.target } : {}),
    initialOpacity: definition.initialOpacity ?? defaultPose.opacity,
    initialRotate: definition.initialRotate ?? defaultPose.rotate,
    initialScale: definition.initialScale ?? defaultPose.scale,
    mountRect,
    opacityIntervals: opacity.intervals,
    pathInitial,
    pathIntervals: path.intervals,
    rotateIntervals: rotate.intervals,
    scaleIntervals: scale.intervals,
    ...(definition.mount.kind === 'clone' ? { sourceTarget: definition.mount.from } : {}),
  };
};

export const compileAnimation = <TSnapshot, TObject>(
  animation: Animation<TSnapshot, TObject>,
  resolveTargetRect: AnimationTargetResolver,
  fallbackSnapshot: TSnapshot | null,
): CompiledAnimation<TSnapshot, TObject> => {
  const actors = animation.actors
    .map((definition) => compileActor(definition, resolveTargetRect))
    .filter((actor): actor is CompiledActor<TObject> => actor !== null);
  const effects = animation.effects.flatMap((definition) =>
    compileTargetEffectSteps(definition.steps, 0, definition.target).events,
  );
  const totalDurationMs = Math.max(
    0,
    ...actors.map((actor) => actor.durationMs),
    ...effects.map((effect) => effect.startMs + effect.durationMs),
    ...animation.checkpoints.map((entry) => entry.atMs),
  );

  return {
    actors,
    checkpoints: animation.checkpoints,
    effects,
    finalSnapshot: latestCheckpoint(animation.checkpoints, totalDurationMs, fallbackSnapshot),
    totalDurationMs,
  };
};

const resolveActorPosition = (
  actor: CompiledActor<unknown>,
  resolveTargetRect: AnimationTargetResolver,
  timeMs: number,
): { readonly currentTarget?: AnimationTargetId; readonly destinationTarget?: AnimationTargetId; readonly left: number; readonly top: number; readonly x: number; readonly y: number } | null => {
  const sampled = samplePathTrack(actor.pathIntervals, actor.pathInitial, timeMs);
  const resolveAnchorWithMountFallback = (anchor: Anchor): ResolvedRect | null => {
    const rect = resolveAnchor(anchor, resolveTargetRect);
    if (rect) {
      return rect;
    }
    if (anchor.kind === 'target' && actor.mountTarget === anchor.target) {
      return actor.mountRect;
    }
    return null;
  };

  const startRect = resolveAnchorWithMountFallback(sampled.start.anchor);
  if (!startRect) {
    return null;
  }

  const endRect = sampled.inFlight ? resolveAnchorWithMountFallback(sampled.end.anchor) : startRect;
  if (!endRect) {
    return null;
  }

  return {
    ...(sampled.currentTarget !== undefined ? { currentTarget: sampled.currentTarget } : {}),
    ...(sampled.destinationTarget !== undefined ? { destinationTarget: sampled.destinationTarget } : {}),
    left: lerp(startRect.left, endRect.left, sampled.progress),
    top: lerp(startRect.top, endRect.top, sampled.progress),
    x: lerp(sampled.start.x, sampled.end.x, sampled.progress),
    y: lerp(sampled.start.y, sampled.end.y, sampled.progress),
  };
};

export const sampleAnimation = <TSnapshot, TObject>(
  compiled: CompiledAnimation<TSnapshot, TObject>,
  resolveTargetRect: AnimationTargetResolver,
  timeMs: number,
): AnimationFrame<TSnapshot, TObject> => {
  const clampedTimeMs = Math.max(0, Math.min(timeMs, compiled.totalDurationMs));
  const activeEffects = createEmptyEffects();

  for (const event of compiled.effects) {
    if (event.startMs <= clampedTimeMs && clampedTimeMs < event.startMs + event.durationMs) {
      activeEffects[event.effect].add(event.target);
    }
  }

  const actors = compiled.actors.flatMap((actor) => {
    const position = resolveActorPosition(actor, resolveTargetRect, clampedTimeMs);
    if (!position) {
      return [];
    }
    const face = sampleFaceTrack(actor.faceIntervals, actor.initialFace, clampedTimeMs);
    return [
      {
        ...(position.currentTarget !== undefined ? { currentTarget: position.currentTarget } : {}),
        ...(position.destinationTarget !== undefined
          ? { destinationTarget: position.destinationTarget }
          : {}),
        ...(face.flipAxis !== undefined ? { flipAxis: face.flipAxis } : {}),
        ...(face.flipProgress !== undefined ? { flipProgress: face.flipProgress } : {}),
        height: actor.mountRect.height,
        id: actor.id,
        left: position.left,
        ...(face.nextObject !== undefined ? { nextObject: face.nextObject } : {}),
        object: face.object,
        opacity: sampleScalarTrack(actor.opacityIntervals, actor.initialOpacity, clampedTimeMs),
        rotate: sampleScalarTrack(actor.rotateIntervals, actor.initialRotate, clampedTimeMs),
        scale: sampleScalarTrack(actor.scaleIntervals, actor.initialScale, clampedTimeMs),
        ...(actor.sourceTarget !== undefined ? { sourceTarget: actor.sourceTarget } : {}),
        top: position.top,
        width: actor.mountRect.width,
        x: position.x,
        y: position.y,
      } satisfies ResolvedActorFrame<TObject>,
    ];
  });

  return {
    activeEffects,
    actors,
    isAnimating: clampedTimeMs < compiled.totalDurationMs,
    presentedSnapshot: latestCheckpoint(compiled.checkpoints, clampedTimeMs, compiled.finalSnapshot),
  };
};

export const createAnimationFrame = <TSnapshot, TObject>(
  presentedSnapshot: TSnapshot | null,
): AnimationFrame<TSnapshot, TObject> => ({
  activeEffects: createEmptyEffects(),
  actors: [],
  isAnimating: false,
  presentedSnapshot,
});
