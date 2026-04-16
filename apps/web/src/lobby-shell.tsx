import { type ReactNode } from 'react';

import { pageWrapClass, shellClass } from './ui-shell.js';
import { PageBackdrop } from './page-backdrop.js';

export type AppConnectionState = 'connecting' | 'connected' | 'disconnected';

const connectionLabel = (connectionState: AppConnectionState): string => {
  switch (connectionState) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    default:
      return 'Offline';
  }
};

const connectionDotClass = (connectionState: AppConnectionState): string => {
  if (connectionState === 'connected') {
    return 'bg-emerald-400 shadow-[0_0_0_0.2rem_rgba(52,211,153,0.14)]';
  }

  if (connectionState === 'connecting') {
    return 'bg-amber-300 shadow-[0_0_0_0.2rem_rgba(251,191,36,0.14)]';
  }

  return 'bg-rose-400 shadow-[0_0_0_0.2rem_rgba(251,113,133,0.14)]';
};

export interface LobbyShellProps {
  readonly children: ReactNode;
  readonly connectionState?: AppConnectionState;
  readonly errorMessage?: string | null;
  readonly playerName?: string | null;
}

export const LobbyShell = ({
  children,
  connectionState,
  errorMessage,
  playerName,
}: LobbyShellProps) => {
  return (
    <PageBackdrop>
      {connectionState ? (
        <section className={`${pageWrapClass} relative z-10`}>
          <div className={`${shellClass} pt-4`}>
            <div className="flex flex-row items-center justify-between gap-3 text-sm text-stone-300">
              <div className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${connectionDotClass(connectionState)}`}
                />
                <strong>{connectionLabel(connectionState)}</strong>
              </div>
              <div className="flex items-center gap-3">
                {errorMessage ? <span className="text-xs text-rose-200">{errorMessage}</span> : null}
                {playerName ? <span className="text-sm text-stone-100">{playerName}</span> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {children}
    </PageBackdrop>
  );
};
