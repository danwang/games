import { type ElementType, type ReactNode } from 'react';

import { nestedPanelClass, shellClass } from '../ui-shell.js';

export interface CardProps {
  readonly as?: ElementType;
  readonly children: ReactNode;
  readonly className?: string;
  readonly tone?: 'shell' | 'panel' | 'empty';
}

export const Card = ({ as: Component = 'div', children, className = '', tone = 'shell' }: CardProps) => {
  const baseClassName =
    tone === 'panel'
      ? nestedPanelClass
      : tone === 'empty'
        ? 'rounded-[1.35rem] border border-dashed border-stone-400/30 bg-stone-900/45 p-4 shadow-none'
        : shellClass;

  return <Component className={`${baseClassName} ${className}`.trim()}>{children}</Component>;
};
