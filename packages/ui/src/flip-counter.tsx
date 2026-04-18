import { useEffect, useMemo, useRef, useState } from 'react';

export interface FlipCounterProps {
  readonly className?: string;
  readonly durationMs?: number;
  readonly label?: string;
  readonly padToDigits?: number;
  readonly value: number;
}

interface DrumGlyphProps {
  readonly current: string;
  readonly durationMs: number;
  readonly next: string;
}

const glyphFaceClass =
  'flex h-[var(--flip-counter-digit-height)] w-[0.72em] items-center justify-center bg-white pb-[0.04em] text-black leading-none [font-variant-numeric:tabular-nums]';

const DrumGlyph = ({ current, durationMs, next }: DrumGlyphProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (current === next) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      timeoutRef.current = null;
    }, durationMs);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [current, durationMs, next]);

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex h-[var(--flip-counter-digit-height)] w-[0.72em] shrink-0 overflow-hidden bg-white"
    >
      <span
        className="absolute inset-0 flex flex-col"
        style={
          isAnimating
            ? {
                animation: `drum-counter-roll ${durationMs}ms ease-in-out both`,
              }
            : {
                transform: 'translateY(calc(-1 * var(--flip-counter-digit-height)))',
              }
        }
      >
        <span className={glyphFaceClass}>{current}</span>
        <span className={glyphFaceClass}>{next}</span>
      </span>
    </span>
  );
};

const toDisplayValue = (value: number, padToDigits?: number): string => {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value).toString().padStart(padToDigits ?? 1, '0');
  return `${sign}${absolute}`;
};

export const FlipCounter = ({
  className,
  durationMs = 420,
  label,
  padToDigits,
  value,
}: FlipCounterProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    previousValueRef.current = displayValue;
    setDisplayValue(value);
  }, [displayValue, value]);

  const previousText = useMemo(
    () => toDisplayValue(previousValueRef.current, padToDigits),
    [displayValue, padToDigits],
  );
  const currentText = useMemo(() => toDisplayValue(displayValue, padToDigits), [displayValue, padToDigits]);

  const maxLength = Math.max(previousText.length, currentText.length);
  const previousGlyphs = previousText.padStart(maxLength, ' ').split('');
  const currentGlyphs = currentText.padStart(maxLength, ' ').split('');

  return (
    <span className={className}>
      <style>{`
        @keyframes drum-counter-roll {
          0% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(calc(-1 * var(--flip-counter-digit-height)));
          }
        }
      `}</style>
      <span
        aria-label={label}
        className="inline-flex h-[var(--flip-counter-digit-height)] items-center gap-0 overflow-hidden bg-white align-top font-mono text-[3rem] font-semibold leading-none tracking-[-0.06em] text-black [font-variant-numeric:tabular-nums]"
        style={{ ['--flip-counter-digit-height' as string]: '1.42em' }}
        role={label ? 'img' : undefined}
      >
        {currentGlyphs.map((glyph, index) => (
          <DrumGlyph
            current={previousGlyphs[index] ?? ' '}
            durationMs={durationMs}
            key={`glyph-${index}`}
            next={glyph}
          />
        ))}
      </span>
    </span>
  );
};
