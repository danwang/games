export interface SegmentedControlOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

export interface SegmentedControlProps<TValue extends string> {
  readonly ariaLabel: string;
  readonly onChange: (value: TValue) => void;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly value: TValue;
}

export const SegmentedControl = <TValue extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: SegmentedControlProps<TValue>) => {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      aria-label={ariaLabel}
      className="relative grid w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      role="tablist"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-amber-300 shadow-[0_10px_28px_rgba(242,193,87,0.22)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          left: '0.25rem',
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[0.34rem] rounded-full bg-[linear-gradient(180deg,_rgba(255,255,255,0.26)_0%,_rgba(255,255,255,0.08)_40%,_rgba(255,255,255,0)_100%)] opacity-90 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          left: '0.375rem',
          width: `calc((100% - 0.75rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            aria-selected={isActive}
            className={`relative z-10 rounded-full px-4 py-3 text-sm font-semibold transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isActive
                ? 'text-stone-950'
                : 'text-stone-300 hover:scale-[1.01] hover:text-stone-100'
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
