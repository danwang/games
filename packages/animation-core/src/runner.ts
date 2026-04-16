import {
  type ActiveEffectMap,
  type Animation,
  type AnimationEffectKind,
  type AnimationFrame,
  type AnimationTargetId,
  type AnimationTargetResolver,
  type ResolvedAttachedObject,
  type ResolvedTranslation,
} from './types.js';

type TranslationEvent<TObject> = {
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly from: AnimationTargetId;
  readonly object: TObject;
  readonly startMs: number;
  readonly to: AnimationTargetId;
};

type TargetEffectEvent = {
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly effect: AnimationEffectKind;
  readonly startMs: number;
  readonly target: AnimationTargetId;
};

type AttachedEffectEvent<TObject> = {
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly effect: Extract<AnimationEffectKind, 'expand' | 'flip' | 'hold' | 'land'>;
  readonly object: TObject;
  readonly startMs: number;
  readonly target: AnimationTargetId;
};

type InternalEvent<TObject> =
  | { readonly kind: 'translate'; readonly event: TranslationEvent<TObject> }
  | { readonly kind: 'target-effect'; readonly event: TargetEffectEvent }
  | { readonly kind: 'attached-effect'; readonly event: AttachedEffectEvent<TObject> };

interface CheckpointEntry<TSnapshot> {
  readonly snapshot: TSnapshot;
  readonly timeMs: number;
}

interface CompiledSegment<TSnapshot, TObject> {
  readonly attachedObjects: readonly ResolvedAttachedObject<TObject>[];
  readonly durationMs: number;
  readonly index: number;
  readonly presentedSnapshot: TSnapshot | null;
  readonly targetEffects: ActiveEffectMap;
  readonly translations: readonly ResolvedTranslation<TObject>[];
}

interface CompiledAnimation<TSnapshot, TObject> {
  readonly segments: readonly CompiledSegment<TSnapshot, TObject>[];
  readonly totalDurationMs: number;
}

type MutableEffectMap = Record<AnimationEffectKind, Set<AnimationTargetId>>;

const createEmptyEffects = (): MutableEffectMap => ({
  bulge: new Set(),
  expand: new Set(),
  fade: new Set(),
  flip: new Set(),
  highlight: new Set(),
  hold: new Set(),
  land: new Set(),
  'pulse-number': new Set(),
});

const cloneEffects = (effects: MutableEffectMap | ActiveEffectMap): ActiveEffectMap => ({
  bulge: new Set(effects.bulge),
  expand: new Set(effects.expand),
  fade: new Set(effects.fade),
  flip: new Set(effects.flip),
  highlight: new Set(effects.highlight),
  hold: new Set(effects.hold),
  land: new Set(effects.land),
  'pulse-number': new Set(effects['pulse-number']),
});

const collect = <TSnapshot, TObject>(
  animation: Animation<TSnapshot, TObject>,
  startMs: number,
): {
  readonly checkpoints: readonly CheckpointEntry<TSnapshot>[];
  readonly durationMs: number;
  readonly events: readonly InternalEvent<TObject>[];
} => {
  switch (animation.type) {
    case 'checkpoint':
      return {
        checkpoints: [{ snapshot: animation.snapshot, timeMs: startMs }],
        durationMs: 0,
        events: [],
      };
    case 'wait':
      return { checkpoints: [], durationMs: animation.durationMs, events: [] };
    case 'translate':
      return {
        checkpoints: [],
        durationMs: (animation.options.delayMs ?? 0) + animation.options.durationMs,
        events: [
          {
            kind: 'translate',
            event: {
              ...(animation.options.delayMs !== undefined ? { delayMs: animation.options.delayMs } : {}),
              durationMs: animation.options.durationMs,
              from: animation.from,
              object: animation.object,
              startMs: startMs + (animation.options.delayMs ?? 0),
              to: animation.to,
            },
          },
        ],
      };
    case 'target-effect':
      return {
        checkpoints: [],
        durationMs: (animation.options.delayMs ?? 0) + animation.options.durationMs,
        events: [
          {
            kind: 'target-effect',
            event: {
              ...(animation.options.delayMs !== undefined ? { delayMs: animation.options.delayMs } : {}),
              durationMs: animation.options.durationMs,
              effect: animation.effect,
              startMs: startMs + (animation.options.delayMs ?? 0),
              target: animation.target,
            },
          },
        ],
      };
    case 'attached-effect':
      return {
        checkpoints: [],
        durationMs: (animation.options.delayMs ?? 0) + animation.options.durationMs,
        events: [
          {
            kind: 'attached-effect',
            event: {
              ...(animation.options.delayMs !== undefined ? { delayMs: animation.options.delayMs } : {}),
              durationMs: animation.options.durationMs,
              effect: animation.effect,
              object: animation.object,
              startMs: startMs + (animation.options.delayMs ?? 0),
              target: animation.target,
            },
          },
        ],
      };
    case 'serial': {
      const checkpoints: CheckpointEntry<TSnapshot>[] = [];
      const events: InternalEvent<TObject>[] = [];
      let cursor = startMs;

      for (const child of animation.animations) {
        const compiled = collect(child, cursor);
        checkpoints.push(...compiled.checkpoints);
        events.push(...compiled.events);
        cursor += compiled.durationMs;
      }

      return {
        checkpoints,
        durationMs: cursor - startMs,
        events,
      };
    }
    case 'parallel': {
      const compiledChildren = animation.animations.map((child) => collect(child, startMs));

      return {
        checkpoints: compiledChildren.flatMap((child) => child.checkpoints),
        durationMs: compiledChildren.reduce((max, child) => Math.max(max, child.durationMs), 0),
        events: compiledChildren.flatMap((child) => child.events),
      };
    }
  }
};

const resolveTranslation = <TObject>(
  event: TranslationEvent<TObject>,
  resolveTargetRect: AnimationTargetResolver,
): ResolvedTranslation<TObject> | null => {
  const fromRect = resolveTargetRect(event.from);
  const toRect = resolveTargetRect(event.to);

  if (!fromRect || !toRect) {
    return null;
  }

  return {
    ...(event.delayMs !== undefined ? { delayMs: event.delayMs } : {}),
    durationMs: event.durationMs,
    from: event.from,
    fromX: fromRect.left,
    fromY: fromRect.top,
    object: event.object,
    to: event.to,
    toX: toRect.left,
    toY: toRect.top,
  };
};

const resolveAttached = <TObject>(
  event: AttachedEffectEvent<TObject>,
  resolveTargetRect: AnimationTargetResolver,
): ResolvedAttachedObject<TObject> | null => {
  const rect = resolveTargetRect(event.target);

  if (!rect) {
    return null;
  }

  return {
    ...(event.delayMs !== undefined ? { delayMs: event.delayMs } : {}),
    durationMs: event.durationMs,
    effect: event.effect,
    height: rect.height,
    left: rect.left,
    object: event.object,
    target: event.target,
    top: rect.top,
    width: rect.width,
  };
};

const latestCheckpoint = <TSnapshot>(
  checkpoints: readonly CheckpointEntry<TSnapshot>[],
  timeMs: number,
  fallbackSnapshot: TSnapshot | null,
): TSnapshot | null =>
  checkpoints
    .filter((entry) => entry.timeMs <= timeMs)
    .sort((left, right) => right.timeMs - left.timeMs)[0]?.snapshot ?? fallbackSnapshot;

const buildBreakpoints = <TSnapshot, TObject>(
  checkpoints: readonly CheckpointEntry<TSnapshot>[],
  events: readonly InternalEvent<TObject>[],
  totalDurationMs: number,
): readonly number[] =>
  [...new Set([
    0,
    totalDurationMs,
    ...checkpoints.map((entry) => entry.timeMs),
    ...events.flatMap((entry) => {
      const start = entry.event.startMs;
      const end = entry.event.startMs + entry.event.durationMs;
      return [start, end];
    }),
  ])].sort((left, right) => left - right);

const compile = <TSnapshot, TObject>(
  animation: Animation<TSnapshot, TObject>,
  resolveTargetRect: AnimationTargetResolver,
  fallbackSnapshot: TSnapshot | null,
): CompiledAnimation<TSnapshot, TObject> => {
  const collected = collect(animation, 0);
  const checkpoints = [...collected.checkpoints].sort((left, right) => left.timeMs - right.timeMs);
  const breakpoints = buildBreakpoints(checkpoints, collected.events, collected.durationMs);
  const segments: CompiledSegment<TSnapshot, TObject>[] = [];

  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const startMs = breakpoints[index]!;
    const endMs = breakpoints[index + 1]!;
    const targetEffects = createEmptyEffects();
    const translations: ResolvedTranslation<TObject>[] = [];
    const attachedObjects: ResolvedAttachedObject<TObject>[] = [];

    for (const entry of collected.events) {
      const eventStart = entry.event.startMs;
      const eventEnd = entry.event.startMs + entry.event.durationMs;

      if (!(eventStart <= startMs && eventEnd > startMs)) {
        continue;
      }

      if (entry.kind === 'translate') {
        const resolved = resolveTranslation(entry.event, resolveTargetRect);
        if (resolved) {
          translations.push(resolved);
        }
        continue;
      }

      targetEffects[entry.event.effect].add(entry.event.target);

      if (entry.kind === 'attached-effect') {
        const resolved = resolveAttached(entry.event, resolveTargetRect);
        if (resolved) {
          attachedObjects.push(resolved);
        }
      }
    }

    segments.push({
      attachedObjects,
      durationMs: endMs - startMs,
      index,
      presentedSnapshot: latestCheckpoint(checkpoints, startMs, fallbackSnapshot),
      targetEffects: cloneEffects(targetEffects),
      translations,
    });
  }

  return {
    segments,
    totalDurationMs: collected.durationMs,
  };
};

export interface AnimationRunnerState<TSnapshot, TObject> {
  readonly compiled: CompiledAnimation<TSnapshot, TObject> | null;
  readonly frame: AnimationFrame<TSnapshot, TObject>;
  readonly segmentIndex: number;
}

export const createAnimationFrame = <TSnapshot, TObject>(
  presentedSnapshot: TSnapshot | null,
): AnimationFrame<TSnapshot, TObject> => ({
  activeEffects: createEmptyEffects(),
  attachedObjects: [],
  isAnimating: false,
  presentedSnapshot,
  translations: [],
});

export const startAnimation = <TSnapshot, TObject>(
  animation: Animation<TSnapshot, TObject>,
  resolveTargetRect: AnimationTargetResolver,
  fallbackSnapshot: TSnapshot | null,
): AnimationRunnerState<TSnapshot, TObject> => {
  const compiled = compile(animation, resolveTargetRect, fallbackSnapshot);
  const firstSegment = compiled.segments[0];

  if (!firstSegment) {
    return {
      compiled,
      frame: createAnimationFrame(fallbackSnapshot),
      segmentIndex: -1,
    };
  }

  return {
    compiled,
    frame: {
      activeEffects: firstSegment.targetEffects,
      attachedObjects: firstSegment.attachedObjects,
      isAnimating: true,
      presentedSnapshot: firstSegment.presentedSnapshot,
      translations: firstSegment.translations,
    },
    segmentIndex: 0,
  };
};

export const advanceAnimation = <TSnapshot, TObject>(
  state: AnimationRunnerState<TSnapshot, TObject>,
): AnimationRunnerState<TSnapshot, TObject> => {
  if (!state.compiled) {
    return state;
  }

  const nextSegment = state.compiled.segments[state.segmentIndex + 1];

  if (!nextSegment) {
    const finalSnapshot =
      state.compiled.segments[state.compiled.segments.length - 1]?.presentedSnapshot ??
      state.frame.presentedSnapshot;

    return {
      compiled: null,
      frame: createAnimationFrame(finalSnapshot),
      segmentIndex: -1,
    };
  }

  return {
    compiled: state.compiled,
    frame: {
      activeEffects: nextSegment.targetEffects,
      attachedObjects: nextSegment.attachedObjects,
      isAnimating: true,
      presentedSnapshot: nextSegment.presentedSnapshot,
      translations: nextSegment.translations,
    },
    segmentIndex: nextSegment.index,
  };
};

export const currentSegmentDuration = <TSnapshot, TObject>(
  state: AnimationRunnerState<TSnapshot, TObject>,
): number =>
  state.compiled?.segments[state.segmentIndex]?.durationMs ?? 0;
