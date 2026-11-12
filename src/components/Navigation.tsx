import React from 'react';
import { Home, Folder, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';
import { PlaneIcon } from './PlaneIcon';
import { ViewTab } from '../types';

interface NavigationProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onCenterTelegramClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onCenterTelegramClick,
}) => {
  return (
    <nav>
      <div className="bar" id="bar">
        <button
          className={currentTab === 'home' ? 'on' : ''}
          onClick={() => onSelectTab('home')}
          aria-label="Home tab"
        >
          <Home size={22} />
          <span>Home</span>
        </button>

        <button
          className={currentTab === 'files' || currentTab === 'starred' ? 'on' : ''}
          onClick={() => onSelectTab('files')}
          aria-label="Files tab"
        >
          <Folder size={22} />
          <span>Files</span>
        </button>

        <button
          className="c"
          onClick={onCenterTelegramClick}
          aria-label="Telegram Cloud Sync"
          title="Telegram Cloud Sync"
        >
          <PlaneIcon size={32} />
        </button>

        <button
          className={currentTab === 'photos' ? 'on' : ''}
          onClick={() => onSelectTab('photos')}
          aria-label="Photos tab"
        >
          <ImageIcon size={22} />
          <span>Photos</span>
        </button>

        <button
          className={currentTab === 'more' ? 'on' : ''}
          onClick={() => onSelectTab('more')}
          aria-label="Settings and more"
        >
          <SlidersHorizontal size={22} />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
};
