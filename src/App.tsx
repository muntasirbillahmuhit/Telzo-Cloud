import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { FilesView } from './components/FilesView';
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
import { LockScreen } from './components/LockScreen';
import { TelegramLoginScreen } from './components/TelegramLoginScreen';
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
        if (parsed && parsed.isSignedIn && parsed.username) {
          return {
            isSignedIn: true,
            username: parsed.username,
            displayName: parsed.displayName || parsed.username,
            syncEnabled: parsed.syncEnabled ?? true,
            cloudStorageType: 'telegram',
            phone: parsed.phone,
            telegramId: parsed.telegramId,
          };
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

  // Auto-lock state & settings (1 minute inactivity protection)
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState<string>(() => {
    return localStorage.getItem('telzo_passcode') || '1234';
  });
  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(() => {
    return localStorage.getItem('telzo_autolock_enabled') !== 'false';
  });

  const handleToggleAutoLock = () => {
    setAutoLockEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('telzo_autolock_enabled', String(next));
      return next;
    });
  };

  const handleChangePasscode = (newCode: string) => {
    setPasscode(newCode);
    localStorage.setItem('telzo_passcode', newCode);
  };

  const handleResetPasscode = () => {
    setPasscode('1234');
    localStorage.setItem('telzo_passcode', '1234');
  };

  const handleLockNow = () => {
    setIsLocked(true);
  };

  // Auto-lock inactivity detection (1 minute = 60,000ms)
  useEffect(() => {
    if (!autoLockEnabled) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const INACTIVITY_LIMIT_MS = 60 * 1000; // 1 minute

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'click',
    ];

    const handleUserActivity = () => {
      if (!isLocked) {
        resetTimer();
      }
    };

    // Initialize inactivity countdown
    resetTimer();

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check inactivity when returning from background or another browser tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        localStorage.setItem('telzo_bg_time', String(Date.now()));
      } else {
        const bgTime = Number(localStorage.getItem('telzo_bg_time') || 0);
        if (bgTime && Date.now() - bgTime >= INACTIVITY_LIMIT_MS) {
          setIsLocked(true);
        } else if (!isLocked) {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoLockEnabled, isLocked]);

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

  const loadBackendData = async () => {
    try {
      const [foldersRes, filesRes, oidcRes, tdlibRes] = await Promise.all([
        fetch('/api/folders').catch(() => null),
        fetch('/api/files').catch(() => null),
        fetch('/api/auth/telegram/status').catch(() => null),
        fetch('/api/telegram/status').catch(() => null),
      ]);

      if (foldersRes && foldersRes.ok) {
        const fData = await foldersRes.json().catch(() => null);
        const list = fData?.folders || fData?.data;
        if (Array.isArray(list)) {
          setFolders(list);
        }
      }

      if (filesRes && filesRes.ok) {
        const fileData = await filesRes.json().catch(() => null);
        const list = fileData?.files || fileData?.data;
        if (Array.isArray(list)) {
          setFiles(list);
        }
      }

      let isAuth = false;
      let uName = user.username;
      let dName = user.displayName;
      let tgId = user.telegramId;
      let idxId = user.indexChannelId;
      let oidcOk = false;
      let tdlibOk = false;

      if (oidcRes && oidcRes.ok) {
        const oData = await oidcRes.json().catch(() => null);
        if (oData?.authenticated && oData?.identity) {
          isAuth = true;
          oidcOk = true;
          if (oData.identity.username) uName = oData.identity.username;
          if (oData.identity.name) dName = oData.identity.name;
          if (oData.identity.sub) tgId = oData.identity.sub;
        }
      }

      if (tdlibRes && tdlibRes.ok) {
        const tData = await tdlibRes.json().catch(() => null);
        if (tData?.tdlibReady && tData?.user) {
          isAuth = true;
          tdlibOk = true;
          if (tData.user.username) uName = tData.user.username;
          const full = `${tData.user.firstName || ''} ${tData.user.lastName || ''}`.trim();
          if (full) dName = full;
          if (tData.user.id) tgId = String(tData.user.id);
          if (tData.indexChannelId) idxId = tData.indexChannelId;
        }
      }

      if (isAuth) {
        setUser({
          isSignedIn: true,
          username: uName || 'telegram_user',
          displayName: dName || uName || 'Telegram User',
          telegramId: tgId,
          syncEnabled: true,
          cloudStorageType: 'telegram',
          oidcVerified: oidcOk,
          tdlibVerified: tdlibOk,
          indexChannelId: idxId,
        });
      }
    } catch (e) {
      console.warn('[TELZO] Backend sync warning:', e);
    }
  };

  const [isLoginRoute, setIsLoginRoute] = useState(() => {
    return window.location.pathname === '/login' || window.location.hash === '#/login';
  });

  // Sync with backend on startup & check OIDC redirect params & route
  useEffect(() => {
    const handlePopState = () => {
      setIsLoginRoute(window.location.pathname === '/login' || window.location.hash === '#/login');
    };
    window.addEventListener('popstate', handlePopState);

    const params = new URLSearchParams(window.location.search);
    const oidcSuccess = params.get('oidc_success');
    const oidcError = params.get('oidc_error');

    if (oidcSuccess || oidcError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (oidcSuccess) {
        setIsLoginRoute(true);
      }
    }

    if (window.location.pathname === '/login') {
      setIsLoginRoute(true);
    }

    loadBackendData();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAddPhotos = async (fileList: FileList) => {
    handleUploadFiles(fileList, undefined, 'Personal');
  };

  const handleUploadFiles = async (fileList: FileList | File[], folderId?: string, tag?: TagName) => {
    const filesArray = Array.from(fileList);
    for (const file of filesArray) {
      const isImg = file.type.startsWith('image/');
      const formData = new FormData();
      formData.append('files', file);
      if (folderId) formData.append('folderId', folderId);
      if (tag) formData.append('tag', tag);

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.file) {
            setFiles((prev) => [data.file, ...prev]);
            continue;
          }
        }
      } catch (e) {
        console.warn('[TELZO] Upload error, falling back locally:', e);
      }

      // Local fallback
      const url = URL.createObjectURL(file);
      setFiles((prev) => [
        {
          id: `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          url,
          folderId,
          starred: false,
          tag: tag || 'Work',
          createdAt: Date.now(),
          isImage: isImg,
        },
        ...prev,
      ]);
    }
  };

  const handleCreateFolder = async (
    name: string,
    description: string,
    color: string,
    isTelegramGroup: boolean
  ) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color, isTelegramGroup }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.folder) {
          setFolders((prev) => [data.folder, ...prev]);
          return;
        }
      }
    } catch (e) {
      console.warn('[TELZO] Folder create backend error, fallback locally:', e);
    }

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

  const handleSignIn = async (username: string, displayName: string): Promise<TelegramUser> => {
    const sanitizedUsername = username.replace(/^https?:\/\/t\.me\//, '').replace(/^@+/, '').trim();
    const sanitizedDisplayName = displayName.trim() || sanitizedUsername;

    if (!sanitizedUsername) {
      throw new Error('Telegram username cannot be empty.');
    }

    const updatedUser: TelegramUser = {
      isSignedIn: true,
      username: sanitizedUsername,
      displayName: sanitizedDisplayName,
      syncEnabled: true,
      cloudStorageType: 'telegram',
    };

    setUser(updatedUser);
    return updatedUser;
  };

  const handleSignOut = async () => {
    const sessionId = localStorage.getItem('telzo_session_id');
    if (sessionId) {
      try {
        await fetch('/api/telegram/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
          },
        });
      } catch (e) {
        console.warn('Backend logout warning:', e);
      }
    }
    setUser(DEFAULT_USER);
    try {
      localStorage.removeItem('telzo_user');
      localStorage.removeItem('telzo_session_id');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
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
      {tab !== 'files' && tab !== 'starred' && tab !== 'more' && (
        <Header
          theme={theme}
          isDarkEffective={isDarkEffective}
          onToggleTheme={handleToggleTheme}
          onOpenAccount={() => setTab('more')}
          user={user}
        />
      )}

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

      {(tab === 'files' || tab === 'starred') && (
        <FilesView
          files={files}
          folders={folders}
          onToggleStar={handleToggleStar}
          onOpenFilePreview={setPreviewFile}
          onOpenUpload={() => setIsUploadOpen(true)}
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
          onOpenTelegramModal={() => {
            window.history.pushState({}, '', '/login');
            setIsLoginRoute(true);
          }}
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
          autoLockEnabled={autoLockEnabled}
          onToggleAutoLock={handleToggleAutoLock}
          passcode={passcode}
          onChangePasscode={handleChangePasscode}
          onLockNow={handleLockNow}
        />
      )}

      {isLoginRoute && (
        <TelegramLoginScreen
          onBack={() => {
            window.history.pushState({}, '', window.location.pathname === '/login' ? '/' : window.location.pathname);
            setIsLoginRoute(false);
            loadBackendData();
          }}
          onSignIn={handleSignIn}
          onRefreshData={loadBackendData}
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
        onRefreshData={loadBackendData}
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

      {/* Security Auto-Lock Passcode Screen */}
      <LockScreen
        isLocked={isLocked}
        onUnlock={() => setIsLocked(false)}
        correctPasscode={passcode}
        onResetPasscode={handleResetPasscode}
      />
    </div>
  );
}
