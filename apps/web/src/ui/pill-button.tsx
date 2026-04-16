import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { primaryButtonClass, secondaryButtonClass } from '../ui-shell.js';

type PillButtonVariant = 'primary' | 'secondary';

export interface PillButtonProps
  extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  readonly variant?: PillButtonVariant;
  readonly fullWidth?: boolean;
}

export const PillButton = ({
  children,
  className = '',
  fullWidth = false,
  variant = 'primary',
  ...props
}: PillButtonProps) => {
  const variantClass = variant === 'primary' ? primaryButtonClass : secondaryButtonClass;

  return (
    <button
      {...props}
      className={[variantClass, fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')}
      type={props.type ?? 'button'}
    >
      {children}
    </button>
  );
};
