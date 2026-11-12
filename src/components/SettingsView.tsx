import React, { useState } from 'react';
import { PlaneIcon } from './PlaneIcon';
import {
  Monitor,
  Sun,
  Moon,
  Clock,
  Share2,
  Trash2,
  HelpCircle,
  ChevronRight,
  LogOut,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  X,
  Copy,
  Check,
  Lock,
  Shield,
  Key,
} from 'lucide-react';
import { TelegramUser, ThemeMode, TagName, TAG_COLORS, CloudFile } from '../types';

interface PersistenceResult {
  exists: boolean;
  filename: string;
  path: string;
  sizeBytes?: number;
  createdAt?: string;
  modifiedAt?: string;
  content?: string;
  checkedAt: string;
  serverUptimeSeconds?: number;
  message: string;
}

interface SettingsViewProps {
  user: TelegramUser;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onOpenTelegramModal: () => void;
  onSignOut: () => void;
  files: CloudFile[];
  trashFiles: CloudFile[];
  onOpenTrashModal: () => void;
  onOpenRecentModal: () => void;
  onOpenSharedModal: () => void;
  onOpenHelpModal: () => void;
  onSelectTag: (tag: TagName) => void;
  activeTag: TagName | null;
  autoLockEnabled: boolean;
  onToggleAutoLock: () => void;
  passcode: string;
  onChangePasscode: (newPasscode: string) => void;
  onLockNow: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  theme,
  onSetTheme,
  onOpenTelegramModal,
  onSignOut,
  files,
  trashFiles,
  onOpenTrashModal,
  onOpenRecentModal,
  onOpenSharedModal,
  onOpenHelpModal,
  onSelectTag,
  activeTag,
  autoLockEnabled,
  onToggleAutoLock,
  passcode,
  onChangePasscode,
  onLockNow,
}) => {
  const [isChangingPasscode, setIsChangingPasscode] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [newInput, setNewInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);

  const [checkingPersistence, setCheckingPersistence] = useState(false);
  const [creatingPersistenceFile, setCreatingPersistenceFile] = useState(false);
  const [persistenceResult, setPersistenceResult] = useState<PersistenceResult | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  const tags: TagName[] = ['Work', 'Personal', 'Design', 'Important'];

  const getTagCount = (t: TagName) => files.filter((f) => f.tag === t).length;

  const handleCheckPersistence = async () => {
    setCheckingPersistence(true);
    try {
      const res = await fetch('/api/test-persistence');
      const data: PersistenceResult = await res.json();
      setPersistenceResult(data);
      setShowAlertModal(true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setPersistenceResult({
        exists: false,
        filename: 'test-persistence.txt',
        path: '/app/applet/test-persistence.txt',
        checkedAt: new Date().toISOString(),
        message: `Failed to connect to backend: ${errMsg}`,
      });
      setShowAlertModal(true);
    } finally {
      setCheckingPersistence(false);
    }
  };

  const handleCreatePersistenceFile = async () => {
    setCreatingPersistenceFile(true);
    try {
      const res = await fetch('/api/test-persistence', { method: 'POST' });
      const data = await res.json();
      if (data.exists || data.success) {
        await handleCheckPersistence();
      }
    } catch (err) {
      console.error('Failed to create persistence test file:', err);
    } finally {
      setCreatingPersistenceFile(false);
    }
  };

  const handleCopyContent = () => {
    if (persistenceResult?.content) {
      navigator.clipboard.writeText(persistenceResult.content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  return (
    <main className="view show" id="more">
      <h1>Settings</h1>
      <p className="sub">Your account and appearance.</p>

      {/* Account Section */}
      <section className="card">
        <div className="user">
          <div className="avatar">
            {user.isSignedIn ? (
              user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'TG'
            ) : (
              <svg viewBox="0 0 24 24" style={{ width: 30, height: 30, stroke: '#fff', fill: 'none', strokeWidth: 2 }}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2>{user.isSignedIn ? user.displayName : 'Not signed in'}</h2>
            <p>
              <span className={`dot ${user.isSignedIn ? 'online' : ''}`} />
              {user.isSignedIn
                ? `Syncing with Telegram (@${user.username})`
                : 'Files are kept in this browser'}
            </p>
          </div>
        </div>

        {user.isSignedIn ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              className="signin"
              style={{ flex: 1, margin: 0 }}
              onClick={onOpenTelegramModal}
            >
              <PlaneIcon size={18} />
              <span>Telegram Sync Active</span>
            </button>
            <button
              onClick={onSignOut}
              className="round"
              style={{ width: 46, height: 46, flexShrink: 0, border: '1px solid var(--line)' }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button className="signin" onClick={onOpenTelegramModal}>
            <PlaneIcon size={18} />
            <span>Sign in with Telegram</span>
          </button>
        )}
      </section>

      {/* Appearance Section */}
      <section className="card">
        <h2>Appearance</h2>
        <p className="m">Follows your device by default.</p>
        <div className="seg" id="seg">
          <button
            className={theme === 'system' ? 'on' : ''}
            onClick={() => onSetTheme('system')}
          >
            <Monitor size={20} />
            <span>System</span>
          </button>
          <button
            className={theme === 'light' ? 'on' : ''}
            onClick={() => onSetTheme('light')}
          >
            <Sun size={20} />
            <span>Light</span>
          </button>
          <button
            className={theme === 'dark' ? 'on' : ''}
            onClick={() => onSetTheme('dark')}
          >
            <Moon size={20} />
            <span>Dark</span>
          </button>
        </div>
      </section>

      {/* Library Section */}
      <section className="card lib">
        <h2>Library</h2>
        <div style={{ marginTop: 8 }}>
          <button className="item" onClick={onOpenRecentModal}>
            <span className="ic">
              <Clock size={19} />
            </span>
            <div>
              <b>Recent</b>
              <small>{files.length} items logged</small>
            </div>
            <ChevronRight className="chev" />
          </button>

          <button className="item" onClick={onOpenSharedModal}>
            <span className="ic">
              <Share2 size={19} />
            </span>
            <div>
              <b>Shared</b>
              <small>0 files publicly shared</small>
            </div>
            <ChevronRight className="chev" />
          </button>

          <button className="item" onClick={onOpenTrashModal}>
            <span className="ic">
              <Trash2 size={19} />
            </span>
            <div>
              <b>Trash</b>
              <small>{trashFiles.length} files</small>
            </div>
            <ChevronRight className="chev" />
          </button>

          <button className="item" onClick={onOpenHelpModal}>
            <span className="ic">
              <HelpCircle size={19} />
            </span>
            <div>
              <b>Help &amp; getting started</b>
              <small>About Telzo Cloud &amp; Telegram storage</small>
            </div>
            <ChevronRight className="chev" />
          </button>
        </div>
      </section>

      {/* Tags Section */}
      <section className="card">
        <h2>Tags</h2>
        <p className="m">Filter files by tag or change from details.</p>
        <div className="tags">
          {tags.map((t) => {
            const count = getTagCount(t);
            const isSelected = activeTag === t;
            return (
              <span
                key={t}
                className={`tag ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectTag(t)}
                role="button"
                tabIndex={0}
              >
                <i style={{ background: TAG_COLORS[t] }} />
                <span>{t}</span>
                <span>{count}</span>
              </span>
            );
          })}
        </div>
      </section>

    </main>
  );
};
