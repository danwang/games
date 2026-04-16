import {
  advanceAnimation,
  createAnimationFrame,
  currentSegmentDuration,
  startAnimation,
  type Animation,
  type AnimationFrame,
  type AnimationTargetResolver,
} from '@games/animation-core';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface UseAnimationRunnerArgs<TSnapshot, TObject> {
  readonly canonicalSnapshot: TSnapshot | null;
  readonly deriveAnimation: (
    previousSnapshot: TSnapshot | null,
    nextSnapshot: TSnapshot | null,
  ) => Animation<TSnapshot, TObject> | null;
  readonly initialPresentedSnapshot?: TSnapshot | null;
  readonly resetKey: string;
  readonly resolveTargetRect: AnimationTargetResolver;
}

export const useAnimationRunner = <TSnapshot, TObject>({
  canonicalSnapshot,
  deriveAnimation,
  initialPresentedSnapshot = null,
  resetKey,
  resolveTargetRect,
}: UseAnimationRunnerArgs<TSnapshot, TObject>): AnimationFrame<TSnapshot, TObject> => {
  const [frame, setFrame] = useState<AnimationFrame<TSnapshot, TObject>>(
    createAnimationFrame(initialPresentedSnapshot ?? canonicalSnapshot),
  );
  const timeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const deriveAnimationRef = useRef(deriveAnimation);

  useEffect(() => {
    deriveAnimationRef.current = deriveAnimation;
  }, [deriveAnimation]);

  const animation = useMemo(
    () =>
      deriveAnimationRef.current(
        initialPresentedSnapshot ?? frame.presentedSnapshot,
        canonicalSnapshot,
      ),
    // canonicalSnapshot / resetKey are the real inputs; frame.presentedSnapshot is only read for live updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canonicalSnapshot, initialPresentedSnapshot, resetKey],
  );

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const fallbackSnapshot = initialPresentedSnapshot ?? canonicalSnapshot;

    if (!animation) {
      setFrame(createAnimationFrame(canonicalSnapshot ?? fallbackSnapshot));
      return;
    }

    let state = startAnimation(animation, resolveTargetRect, fallbackSnapshot);

    const tick = () => {
      state = advanceAnimation(state);
      setFrame(state.frame);

      const durationMs = currentSegmentDuration(state);

      if (state.frame.isAnimating && durationMs > 0) {
        timeoutRef.current = window.setTimeout(tick, durationMs);
      }
    };

    rafRef.current = window.requestAnimationFrame(() => {
      state = startAnimation(animation, resolveTargetRect, fallbackSnapshot);
      setFrame(state.frame);

      const durationMs = currentSegmentDuration(state);

      if (state.frame.isAnimating && durationMs > 0) {
        timeoutRef.current = window.setTimeout(tick, durationMs);
      }
    });

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [animation, canonicalSnapshot, initialPresentedSnapshot, resolveTargetRect, resetKey]);

  return frame;
};
