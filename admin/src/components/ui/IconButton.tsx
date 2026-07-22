import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonVariant, ButtonSize } from './Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  label: string;
  active?: boolean;
}

export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  label,
  active = false,
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  const classes = [
    'kyro-btn',
    `kyro-btn-${variant}`,
    `kyro-btn-${size}`,
    'kyro-btn-icon',
    active ? 'kyro-btn-active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button"
      className={classes}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
}
