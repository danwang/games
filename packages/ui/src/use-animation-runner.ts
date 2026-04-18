import {
  compileAnimation,
  createAnimationFrame,
  sampleAnimation,
  type Animation,
  type AnimationFrame,
  type AnimationTargetResolver,
  type CompiledAnimation,
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
    // canonicalSnapshot / resetKey are the actual lifecycle inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canonicalSnapshot, initialPresentedSnapshot, resetKey],
  );

  const compiled = useMemo<CompiledAnimation<TSnapshot, TObject> | null>(() => {
    const fallbackSnapshot = initialPresentedSnapshot ?? canonicalSnapshot;
    return animation ? compileAnimation(animation, resolveTargetRect, fallbackSnapshot) : null;
  }, [animation, canonicalSnapshot, initialPresentedSnapshot, resolveTargetRect]);

  useEffect(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const fallbackSnapshot = initialPresentedSnapshot ?? canonicalSnapshot;

    if (!compiled) {
      setFrame(createAnimationFrame(canonicalSnapshot ?? fallbackSnapshot));
      return;
    }

    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsedMs = now - startedAt;
      const nextFrame = sampleAnimation(compiled, resolveTargetRect, elapsedMs);
      setFrame(nextFrame);

      if (elapsedMs < compiled.totalDurationMs) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [canonicalSnapshot, compiled, initialPresentedSnapshot, resolveTargetRect, resetKey]);

  return frame;
};
