import React from 'react';
import { X } from 'lucide-react';

const VARIANT_CLASSES = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
} as const;

const SIZE_CLASSES = {
  sm: 'button-size-sm',
  md: 'button-size-md',
  lg: 'button-size-lg',
} as const;

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    accentColor?: string;
  }
> = React.memo(({ variant = 'secondary', size = 'md', children, accentColor, className = '', ...props }) => {
  const combinedClasses = `btn-base focus:outline-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;
  const style =
    variant === 'primary' && accentColor
      ? { backgroundColor: accentColor, ...props.style }
      : props.style;

  return (
    <button {...props} className={combinedClasses} style={style}>
      {children}
    </button>
  );
});

const ICON_SIZE_CLASSES = {
  sm: 'icon-button-size-sm',
  md: 'icon-button-size-md',
  lg: 'icon-button-size-lg',
} as const;

const ICON_VARIANT_CLASSES = {
  ghost: 'icon-button-ghost',
  filled: 'icon-button-filled',
} as const;

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'ghost' | 'filled';
  }
> = React.memo(({ icon, size = 'md', variant = 'ghost', className = '', ...props }) => {
  return (
    <button
      {...props}
      className={`${ICON_SIZE_CLASSES[size]} ${ICON_VARIANT_CLASSES[variant]} rounded-full transition-colors focus:outline-none ${className}`}
    >
      {icon}
    </button>
  );
});

const MODAL_SIZE_CLASSES = {
  sm: 'modal-size-sm',
  md: 'modal-size-md',
  lg: 'modal-size-lg',
  xl: 'modal-size-xl',
  full: 'modal-size-full',
} as const;

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}> = React.memo(({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) => {
  if (!isOpen) return null;

  const isFullScreen = size === 'full';

  return (
    <div className="modal-overlay">
      <div
        className={`card-base shadow-2xl w-full ${MODAL_SIZE_CLASSES[size]} ${
          isFullScreen ? '' : 'modal-content-scrollable'
        }`}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 className="text-xl font-bold">{title}</h2>}
            {showCloseButton && (
              <IconButton icon={<X size={24} />} onClick={onClose} className="ml-auto" />
            )}
          </div>
        )}

        <div className={isFullScreen ? 'modal-content-full-height' : 'modal-content'}>
          {children}
        </div>
      </div>
    </div>
  );
});
