import { type ReactNode } from 'react';

import { pageBackgroundClass } from './ui-shell.js';

export interface PageBackdropProps {
  readonly children: ReactNode;
}

export const PageBackdrop = ({ children }: PageBackdropProps) => {
  return (
    <main className={pageBackgroundClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.15),_transparent_28%),linear-gradient(180deg,_#20140f,_#090d15)]"
      />
      <div className="relative z-10">{children}</div>
    </main>
  );
};
