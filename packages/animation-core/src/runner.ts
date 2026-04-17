import {
  type ActiveEffectMap,
  type Animation,
  type AnimationFrame,
  type AnimationTargetId,
  type AnimationTargetResolver,
  type OverlayAnimation,
  type OverlayMount,
  type OverlayPose,
  type OverlayStep,
  type ResolvedOverlayActor,
  type ResolvedRect,
  type TargetEffectAnimation,
  type TargetEffectKind,
  type TargetEffectStep,
} from './types.js';

interface OverlayAnchorTarget {
  readonly kind: 'target';
  readonly target: AnimationTargetId;
}

interface OverlayAnchorStatic {
  readonly height: number;
  readonly kind: 'static';
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

type OverlayAnchor = OverlayAnchorTarget | OverlayAnchorStatic;

interface OverlayState<TObject> {
  readonly anchor: OverlayAnchor;
  readonly object: TObject;
  readonly pose: OverlayPose;
}

interface OverlayEvent<TObject> {
  readonly durationMs: number;
  readonly endState: OverlayState<TObject>;
  readonly id: string;
  readonly nextObject?: TObject;
  readonly object: TObject;
  readonly phase: 'fadeTo' | 'flipTo' | 'hold' | 'to';
  readonly sizeRect?: ResolvedRect;
  readonly sourceTarget?: AnimationTargetId;
  readonly startMs: number;
  readonly startState: OverlayState<TObject>;
}

interface TargetEffectEvent {
  readonly durationMs: number;
  readonly effect: TargetEffectKind;
  readonly startMs: number;
  readonly target: AnimationTargetId;
}

interface CompiledSegment<TSnapshot, TObject> {
  readonly durationMs: number;
  readonly index: number;
  readonly overlays: readonly ResolvedOverlayActor<TObject>[];
  readonly presentedSnapshot: TSnapshot | null;
  readonly targetEffects: ActiveEffectMap;
}

interface CompiledAnimation<TSnapshot, TObject> {
  readonly finalSnapshot: TSnapshot | null;
  readonly segments: readonly CompiledSegment<TSnapshot, TObject>[];
}

interface AnimationRunnerStateInternal<TSnapshot, TObject> {
  readonly compiled: CompiledAnimation<TSnapshot, TObject> | null;
  readonly frame: AnimationFrame<TSnapshot, TObject>;
  readonly segmentIndex: number;
}

type MutableEffectMap = Record<TargetEffectKind, Set<AnimationTargetId>>;

const defaultPose: OverlayPose = {
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

const cloneEffects = (effects: MutableEffectMap | ActiveEffectMap): ActiveEffectMap => ({
  bulge: new Set(effects.bulge),
  fade: new Set(effects.fade),
  highlight: new Set(effects.highlight),
  'pulse-number': new Set(effects['pulse-number']),
  reveal: new Set(effects.reveal),
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
  anchor: OverlayAnchor,
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
  mount: OverlayMount,
  resolveTargetRect: AnimationTargetResolver,
): OverlayAnchor | null => {
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

const toAnchor = (
  destination: AnimationTargetId | 'self',
  currentAnchor: OverlayAnchor,
): OverlayAnchor =>
  destination === 'self'
    ? currentAnchor
    : {
        kind: 'target',
        target: destination,
      };

const compileOverlaySteps = <TObject>(
  steps: readonly OverlayStep<TObject>[],
  initialState: OverlayState<TObject>,
  startMs: number,
): {
  readonly durationMs: number;
  readonly endState: OverlayState<TObject>;
  readonly events: readonly OverlayEvent<TObject>[];
} => {
  const compileStep = (
    step: OverlayStep<TObject>,
    state: OverlayState<TObject>,
    offsetMs: number,
  ): {
    readonly durationMs: number;
    readonly endState: OverlayState<TObject>;
    readonly events: readonly OverlayEvent<TObject>[];
  } => {
    switch (step.type) {
      case 'wait':
        return {
          durationMs: step.durationMs,
          endState: state,
          events: [],
        };
      case 'hold':
        return {
          durationMs: step.durationMs,
          endState: state,
          events: [
            {
              durationMs: step.durationMs,
              endState: state,
              id: '',
              object: state.object,
              phase: 'hold',
              startMs: offsetMs,
              startState: state,
            },
          ],
        };
      case 'flipTo': {
        const endState = {
          ...state,
          object: step.object,
        };

        return {
          durationMs: step.durationMs,
          endState,
          events: [
            {
              durationMs: step.durationMs,
              endState,
              id: '',
              nextObject: step.object,
              object: state.object,
              phase: 'flipTo',
              startMs: offsetMs,
              startState: state,
            },
          ],
        };
      }
      case 'fadeTo': {
        const endState = {
          ...state,
          pose: {
            opacity: step.opacity,
            rotate: step.rotate ?? state.pose.rotate,
            scale: step.scale ?? state.pose.scale,
            x: step.x ?? state.pose.x,
            y: step.y ?? state.pose.y,
          },
        };

        return {
          durationMs: step.durationMs,
          endState,
          events: [
            {
              durationMs: step.durationMs,
              endState,
              id: '',
              object: state.object,
              phase: 'fadeTo',
              startMs: offsetMs,
              startState: state,
            },
          ],
        };
      }
      case 'to': {
        const endState = {
          anchor: toAnchor(step.to, state.anchor),
          object: state.object,
          pose: {
            opacity: step.opacity ?? state.pose.opacity,
            rotate: step.rotate ?? state.pose.rotate,
            scale: step.scale ?? state.pose.scale,
            x: step.x ?? state.pose.x,
            y: step.y ?? state.pose.y,
          },
        };

        return {
          durationMs: step.durationMs,
          endState,
          events: [
            {
              durationMs: step.durationMs,
              endState,
              id: '',
              object: state.object,
              phase: 'to',
              startMs: offsetMs,
              startState: state,
            },
          ],
        };
      }
      case 'sequence': {
        let cursor = offsetMs;
        let currentState = state;
        const events: OverlayEvent<TObject>[] = [];

        for (const child of step.steps) {
          const compiled = compileStep(child, currentState, cursor);
          cursor += compiled.durationMs;
          currentState = compiled.endState;
          events.push(...compiled.events);
        }

        return {
          durationMs: cursor - offsetMs,
          endState: currentState,
          events,
        };
      }
      case 'parallel': {
        const compiledChildren = step.steps.map((child) => compileStep(child, state, offsetMs));
        const durationMs = compiledChildren.reduce((max, child) => Math.max(max, child.durationMs), 0);
        let endState = state;
        let winningDurationMs = -1;

        for (const child of compiledChildren) {
          if (child.durationMs >= winningDurationMs) {
            winningDurationMs = child.durationMs;
            endState = child.endState;
          }
        }

        return {
          durationMs,
          endState,
          events: compiledChildren.flatMap((child) => child.events),
        };
      }
    }
  };

  let cursor = startMs;
  let state = initialState;
  const events: OverlayEvent<TObject>[] = [];

  for (const step of steps) {
    const compiled = compileStep(step, state, cursor);
    cursor += compiled.durationMs;
    state = compiled.endState;
    events.push(...compiled.events);
  }

  return {
    durationMs: cursor - startMs,
    endState: state,
    events,
  };
};

const compileTargetEffectSteps = (
  steps: readonly TargetEffectStep[],
  startMs: number,
  target: AnimationTargetId,
): {
  readonly durationMs: number;
  readonly events: readonly TargetEffectEvent[];
} => {
  const compileStep = (
    step: TargetEffectStep,
    offsetMs: number,
  ): {
    readonly durationMs: number;
    readonly events: readonly TargetEffectEvent[];
  } => {
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
          events: [
            {
              durationMs: step.durationMs,
              effect: step.type,
              startMs: offsetMs,
              target,
            },
          ],
        };
      case 'sequence': {
        let cursor = offsetMs;
        const events: TargetEffectEvent[] = [];

        for (const child of step.steps) {
          const compiled = compileStep(child, cursor);
          cursor += compiled.durationMs;
          events.push(...compiled.events);
        }

        return {
          durationMs: cursor - offsetMs,
          events,
        };
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

  return {
    durationMs: cursor - startMs,
    events,
  };
};

const buildBreakpoints = <TSnapshot, TObject>(
  animation: Animation<TSnapshot, TObject>,
  overlayEvents: readonly OverlayEvent<TObject>[],
  effectEvents: readonly TargetEffectEvent[],
): readonly number[] =>
  [...new Set([
    0,
    ...animation.checkpoints.map((entry) => entry.atMs),
    ...overlayEvents.flatMap((event) => [event.startMs, event.startMs + event.durationMs]),
    ...effectEvents.flatMap((event) => [event.startMs, event.startMs + event.durationMs]),
  ])].sort((left, right) => left - right);

const resolveOverlayEvent = <TObject>(
  event: OverlayEvent<TObject>,
  resolveTargetRect: AnimationTargetResolver,
): ResolvedOverlayActor<TObject> | null => {
  const startRect = resolveAnchor(event.startState.anchor, resolveTargetRect);
  const endRect = resolveAnchor(event.endState.anchor, resolveTargetRect);

  if (!startRect || !endRect) {
    return null;
  }

  return {
    durationMs: event.durationMs,
    endLeft: endRect.left,
    endPose: event.endState.pose,
    endTop: endRect.top,
    height: event.sizeRect?.height || endRect.height || startRect.height,
    id: event.id,
    ...(event.nextObject !== undefined ? { nextObject: event.nextObject } : {}),
    object: event.object,
    phase: event.phase,
    ...(event.sourceTarget !== undefined ? { sourceTarget: event.sourceTarget } : {}),
    startLeft: startRect.left,
    startPose: event.startState.pose,
    startTop: startRect.top,
    width: event.sizeRect?.width || endRect.width || startRect.width,
  };
};

const compile = <TSnapshot, TObject>(
  animation: Animation<TSnapshot, TObject>,
  resolveTargetRect: AnimationTargetResolver,
  fallbackSnapshot: TSnapshot | null,
): CompiledAnimation<TSnapshot, TObject> => {
  const overlayEvents: OverlayEvent<TObject>[] = [];
  const effectEvents: TargetEffectEvent[] = [];
  let totalDurationMs = 0;

  for (const definition of animation.overlays) {
    const mountAnchor = resolveMount(definition.mount, resolveTargetRect);

    if (!mountAnchor) {
      continue;
    }

    const mountRect = resolveAnchor(mountAnchor, resolveTargetRect);

    if (!mountRect) {
      continue;
    }

    const initialState: OverlayState<TObject> = {
      anchor: mountAnchor,
      object: definition.object,
      pose: {
        ...defaultPose,
        ...definition.initialPose,
      },
    };

    const compiled = compileOverlaySteps(definition.steps, initialState, 0);
    overlayEvents.push(
      ...compiled.events.map((event) => ({
        ...event,
        id: definition.id,
        sizeRect: mountRect,
        ...(definition.mount.kind === 'clone' ? { sourceTarget: definition.mount.from } : {}),
      })),
    );
    totalDurationMs = Math.max(totalDurationMs, compiled.durationMs);
  }

  for (const definition of animation.effects) {
    const compiled = compileTargetEffectSteps(definition.steps, 0, definition.target);
    effectEvents.push(...compiled.events);
    totalDurationMs = Math.max(totalDurationMs, compiled.durationMs);
  }

  totalDurationMs = Math.max(
    totalDurationMs,
    animation.checkpoints.reduce((max, entry) => Math.max(max, entry.atMs), 0),
  );

  const breakpoints = buildBreakpoints(animation, overlayEvents, effectEvents);
  const segments: CompiledSegment<TSnapshot, TObject>[] = [];

  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const startMs = breakpoints[index]!;
    const endMs = breakpoints[index + 1]!;
    const effects = createEmptyEffects();
    const overlays = overlayEvents
      .filter((event) => event.startMs <= startMs && event.startMs + event.durationMs > startMs)
      .map((event) => resolveOverlayEvent(event, resolveTargetRect))
      .filter((event): event is ResolvedOverlayActor<TObject> => event !== null);

    for (const event of effectEvents) {
      if (event.startMs <= startMs && event.startMs + event.durationMs > startMs) {
        effects[event.effect].add(event.target);
      }
    }

    segments.push({
      durationMs: endMs - startMs,
      index,
      overlays,
      presentedSnapshot: latestCheckpoint(animation.checkpoints, startMs, fallbackSnapshot),
      targetEffects: cloneEffects(effects),
    });
  }

  return {
    finalSnapshot: latestCheckpoint(animation.checkpoints, totalDurationMs, fallbackSnapshot),
    segments,
  };
};

export interface AnimationRunnerState<TSnapshot, TObject> extends AnimationRunnerStateInternal<TSnapshot, TObject> {}

export const createAnimationFrame = <TSnapshot, TObject>(
  presentedSnapshot: TSnapshot | null,
): AnimationFrame<TSnapshot, TObject> => ({
  activeEffects: createEmptyEffects(),
  isAnimating: false,
  overlays: [],
  presentedSnapshot,
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
      frame: createAnimationFrame(compiled.finalSnapshot ?? fallbackSnapshot),
      segmentIndex: -1,
    };
  }

  return {
    compiled,
    frame: {
      activeEffects: firstSegment.targetEffects,
      isAnimating: true,
      overlays: firstSegment.overlays,
      presentedSnapshot: firstSegment.presentedSnapshot,
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
    return {
      compiled: null,
      frame: createAnimationFrame(state.compiled.finalSnapshot),
      segmentIndex: -1,
    };
  }

  return {
    compiled: state.compiled,
    frame: {
      activeEffects: nextSegment.targetEffects,
      isAnimating: true,
      overlays: nextSegment.overlays,
      presentedSnapshot: nextSegment.presentedSnapshot,
    },
    segmentIndex: nextSegment.index,
  };
};

export const currentSegmentDuration = <TSnapshot, TObject>(
  state: AnimationRunnerState<TSnapshot, TObject>,
): number => state.compiled?.segments[state.segmentIndex]?.durationMs ?? 0;
