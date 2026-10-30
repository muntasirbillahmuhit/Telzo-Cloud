import React from 'react';
import { PlaneIcon } from './PlaneIcon';
import { Sun, Moon, User } from 'lucide-react';
import { TelegramUser, ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  isDarkEffective: boolean;
  onToggleTheme: () => void;
  onOpenAccount: () => void;
  user: TelegramUser;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkEffective,
  onToggleTheme,
  onOpenAccount,
  user,
}) => {
  return (
    <header>
      <div className="brand">
        <div className="logo" aria-label="Telzo logo">
          <PlaneIcon size={16} />
        </div>
        <span>Telzo Cloud</span>
      </div>
      <div className="hr">
        <button
          className="round"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle Light / Dark"
        >
          {isDarkEffective ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          className="round avatar"
          onClick={onOpenAccount}
          aria-label="Account Settings"
          title={user.isSignedIn ? `@${user.username}` : 'Account Settings'}
        >
          {user.isSignedIn && user.displayName ? (
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              {user.displayName.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <User size={18} />
          )}
        </button>
      </div>
    </header>
  );
};
