import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  actions?: ReactNode;
}

export function Header({ title, onMenuClick, actions }: HeaderProps) {
  return (
    <header className="kyro-header">
      <div className="kyro-header-left">
        <button type="button"
          className="kyro-header-menu"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <h1 className="kyro-header-title">{title}</h1>
      </div>
      <div className="kyro-header-right">
        {actions}
        <div className="kyro-header-user">
          <button type="button" className="kyro-header-user-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
