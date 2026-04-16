import { type ElementType, type ReactNode } from 'react';

import { eyebrowClass } from '../ui-shell.js';

export interface SectionLabelProps {
  readonly as?: ElementType;
  readonly children: ReactNode;
  readonly className?: string;
}

export const SectionLabel = ({
  as: Component = 'h2',
  children,
  className = '',
}: SectionLabelProps) => {
  return <Component className={`${eyebrowClass} ${className}`.trim()}>{children}</Component>;
};
