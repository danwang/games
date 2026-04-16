export const pageBackgroundClass =
  'relative isolate min-h-screen bg-[#090d15] text-stone-100';

export const pageWrapClass =
  'mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4';

export const shellClass =
  'rounded-[1.8rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6';

export const nestedPanelClass =
  'rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

export const fieldClass =
  'w-full appearance-none rounded-[1.2rem] border border-white/12 bg-white/5 px-4 py-3.5 text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-300/45 focus:bg-white/[0.08]';

export const primaryButtonClass =
  'rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClass =
  'rounded-full border border-white/14 bg-white/5 px-5 py-3 text-sm font-semibold text-stone-100 transition enabled:hover:border-white/20 enabled:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50';

export const mutedBadgeClass =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.24em] text-stone-300';

export const eyebrowClass = 'text-[0.72rem] uppercase tracking-[0.32em] text-amber-300/70';

export const heroTitleClass =
  "mt-3 max-w-[10ch] font-['Iowan_Old_Style','Palatino_Linotype',serif] text-[clamp(2.6rem,10vw,4.5rem)] leading-[0.95] text-amber-50";

export const pageTitleClass =
  "mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-[clamp(1.45rem,5.6vw,2.15rem)] leading-[1.02] text-amber-50";

export const sectionTitleClass =
  'mt-2 text-[clamp(1.12rem,3.2vw,1.35rem)] font-semibold leading-[1.15] text-stone-100';

export const heroCopyClass = 'mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base';

export const roomStatusPillClass: Readonly<Record<'waiting' | 'in_progress' | 'finished', string>> = {
  waiting:
    'inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-100',
  in_progress:
    'inline-flex items-center rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-xs font-medium text-sky-100',
  finished:
    'inline-flex items-center rounded-full border border-stone-300/20 bg-stone-300/10 px-3 py-1.5 text-xs font-medium text-stone-300',
};

export const roomStatusLabel = (status: 'waiting' | 'in_progress' | 'finished'): string => {
  if (status === 'in_progress') {
    return 'In progress';
  }

  if (status === 'finished') {
    return 'Finished';
  }

  return 'Waiting';
};
