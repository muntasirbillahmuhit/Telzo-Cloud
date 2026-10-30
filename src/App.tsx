import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { StarredView } from './components/StarredView';
import { PhotosView } from './components/PhotosView';
import { SettingsView } from './components/SettingsView';
import {
  NewFolderModal,
  UploadModal,
  FilePreviewModal,
  TelegramModal,
  TrashModal,
  HelpModal,
  SharedModal,
} from './components/Modals';
import { CloudFile, CloudFolder, TagName, TelegramUser, ThemeMode, ViewTab } from './types';

const DEFAULT_USER: TelegramUser = {
  isSignedIn: false,
  username: '',
  displayName: '',
  syncEnabled: false,
  cloudStorageType: 'browser',
};

export default function App() {
  const [tab, setTab] = useState<ViewTab>('home');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('telzo_theme') as ThemeMode) || 'system';
  });
  const [isDarkEffective, setIsDarkEffective] = useState(false);

  const [files, setFiles] = useState<CloudFile[]>(() => {
    const saved = localStorage.getItem('telzo_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Exclude legacy example items if previously stored in localStorage
        if (Array.isArray(parsed)) {
          return parsed.filter((f) => !['p1', 'p2', 'p3', 'd1', 'd2'].includes(f.id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [folders, setFolders] = useState<CloudFolder[]>(() => {
    const saved = localStorage.getItem('telzo_folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Exclude legacy example folders if previously stored in localStorage
        if (Array.isArray(parsed)) {
          return parsed.filter((f) => !['f1', 'f2', 'f3'].includes(f.id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [trashFiles, setTrashFiles] = useState<CloudFile[]>(() => {
    const saved = localStorage.getItem('telzo_trash');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [user, setUser] = useState<TelegramUser>(() => {
    const saved = localStorage.getItem('telzo_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isSignedIn && parsed.username && parsed.username !== 'muntasir') {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_USER;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<TagName | null>(null);

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('telzo_theme', theme);

    const updateDarkEffective = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      setIsDarkEffective(isDark);
    };

    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }

    updateDarkEffective();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') updateDarkEffective();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Persist files & folders safely
  useEffect(() => {
    try {
      localStorage.setItem('telzo_files', JSON.stringify(files));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [files]);

  useEffect(() => {
    try {
      localStorage.setItem('telzo_folders', JSON.stringify(folders));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('telzo_trash', JSON.stringify(trashFiles));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [trashFiles]);

  useEffect(() => {
    try {
      localStorage.setItem('telzo_user', JSON.stringify(user));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [user]);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = isDarkEffective ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleToggleStar = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f))
    );
    if (previewFile && previewFile.id === id) {
      setPreviewFile((prev) => (prev ? { ...prev, starred: !prev.starred } : null));
    }
  };

  const handleDeleteFile = (id: string) => {
    const fileToDelete = files.find((f) => f.id === id);
    if (fileToDelete) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setTrashFiles((prev) => [fileToDelete, ...prev]);
    }
  };

  const handleRestoreFromTrash = (id: string) => {
    const fileToRestore = trashFiles.find((f) => f.id === id);
    if (fileToRestore) {
      setTrashFiles((prev) => prev.filter((f) => f.id !== id));
      setFiles((prev) => [fileToRestore, ...prev]);
    }
  };

  const handleEmptyTrash = () => {
    setTrashFiles([]);
  };

  const handleChangeTag = (id: string, tag: TagName) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, tag } : f)));
    if (previewFile && previewFile.id === id) {
      setPreviewFile((prev) => (prev ? { ...prev, tag } : null));
    }
  };

  const handleAddPhotos = (fileList: FileList) => {
    const newPhotos: CloudFile[] = [];
    Array.from(fileList).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPhotos.push({
          id: `up_${Date.now()}_${index}`,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          url,
          starred: false,
          tag: 'Personal',
          createdAt: Date.now(),
          isImage: true,
        });
      }
    });

    if (newPhotos.length > 0) {
      setFiles((prev) => [...newPhotos, ...prev]);
    }
  };

  const handleUploadFiles = (fileList: FileList, folderId?: string, tag?: TagName) => {
    const newUploads: CloudFile[] = [];
    Array.from(fileList).forEach((file, index) => {
      const isImg = file.type.startsWith('image/');
      const url = URL.createObjectURL(file);
      newUploads.push({
        id: `up_${Date.now()}_${index}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        url,
        folderId,
        starred: false,
        tag: tag || 'Work',
        createdAt: Date.now(),
        isImage: isImg,
      });
    });

    if (newUploads.length > 0) {
      setFiles((prev) => [...newUploads, ...prev]);
    }
  };

  const handleCreateFolder = (
    name: string,
    description: string,
    color: string,
    isTelegramGroup: boolean
  ) => {
    const newFolder: CloudFolder = {
      id: `folder_${Date.now()}`,
      name,
      description,
      color,
      isTelegramGroup,
      createdAt: Date.now(),
    };
    setFolders((prev) => [newFolder, ...prev]);
  };

  const handleSignIn = (username: string, displayName: string) => {
    setUser({
      isSignedIn: true,
      username,
      displayName,
      syncEnabled: true,
      cloudStorageType: 'telegram',
    });
  };

  const handleSignOut = () => {
    setUser({
      isSignedIn: false,
      username: '',
      displayName: '',
      syncEnabled: false,
      cloudStorageType: 'browser',
    });
  };

  const handleSelectTag = (t: TagName) => {
    setActiveTag((prev) => (prev === t ? null : t));
    setTab('home');
  };

  const displayedFiles = files.filter((f) => {
    if (activeTag && f.tag !== activeTag) return false;
    return true;
  });

  return (
    <div className="app">
      <Header
        theme={theme}
        isDarkEffective={isDarkEffective}
        onToggleTheme={handleToggleTheme}
        onOpenAccount={() => setTab('more')}
        user={user}
      />

      {activeTag && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--chip)',
            padding: '8px 16px',
            borderRadius: 9999,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>Filtering by Tag: {activeTag}</span>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              background: 'none',
              border: 0,
              cursor: 'pointer',
              color: 'var(--ink)',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {tab === 'home' && (
        <HomeView
          files={displayedFiles}
          folders={folders}
          user={user}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenNewFolder={() => setIsNewFolderOpen(true)}
          onSelectFolder={setSelectedFolderId}
          selectedFolderId={selectedFolderId}
          onOpenFilePreview={setPreviewFile}
        />
      )}

      {tab === 'starred' && (
        <StarredView
          files={displayedFiles}
          onToggleStar={handleToggleStar}
          onOpenFilePreview={setPreviewFile}
        />
      )}

      {tab === 'photos' && (
        <PhotosView
          files={displayedFiles}
          onAddPhotos={handleAddPhotos}
          onToggleStar={handleToggleStar}
          onOpenFilePreview={setPreviewFile}
        />
      )}

      {tab === 'more' && (
        <SettingsView
          user={user}
          theme={theme}
          onSetTheme={setTheme}
          onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
          onSignOut={handleSignOut}
          files={files}
          trashFiles={trashFiles}
          onOpenTrashModal={() => setIsTrashModalOpen(true)}
          onOpenRecentModal={() => {
            setTab('home');
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          onOpenSharedModal={() => setIsSharedModalOpen(true)}
          onOpenHelpModal={() => setIsHelpModalOpen(true)}
          onSelectTag={handleSelectTag}
          activeTag={activeTag}
        />
      )}

      <Navigation
        currentTab={tab}
        onSelectTab={setTab}
        onCenterTelegramClick={() => setIsTelegramModalOpen(true)}
      />

      {/* Modals */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folders={folders}
        onUploadFiles={handleUploadFiles}
      />

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onToggleStar={handleToggleStar}
        onDeleteFile={handleDeleteFile}
        onChangeTag={handleChangeTag}
        folders={folders}
      />

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        trashFiles={trashFiles}
        onRestore={handleRestoreFromTrash}
        onEmptyTrash={handleEmptyTrash}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <SharedModal
        isOpen={isSharedModalOpen}
        onClose={() => setIsSharedModalOpen(false)}
      />
    </div>
  );
}
