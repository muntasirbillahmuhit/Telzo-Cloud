import React, { useState, useEffect } from 'react';
import {
  X,
  FolderPlus,
  Upload,
  Star,
  Download,
  Trash2,
  Share2,
  Check,
  Send,
  HelpCircle,
  RotateCcw,
  Tag as TagIcon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  Smartphone,
  Shield,
  Key,
  ArrowLeft,
  ChevronDown,
  Cloud,
  Monitor,
} from 'lucide-react';
import { PlaneIcon } from './PlaneIcon';
import { CloudFile, CloudFolder, TagName, TAG_COLORS, TelegramUser } from '../types';
import { DeviceStorageService, PickedFile, UploadProgressInfo } from '../services/deviceStorage.service';

// =================== New Folder Modal ===================
interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, description: string, color: string, isTelegramGroup: boolean) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({ isOpen, onClose, onCreateFolder }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('A private Telegram group');
  const [color, setColor] = useState('#5a8bff');
  const [isTelegramGroup, setIsTelegramGroup] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateFolder(name.trim(), description.trim(), color, isTelegramGroup);
    setName('');
    onClose();
  };

  const folderColors = ['#5a8bff', '#4f7cf0', '#f4a04a', '#8b6cf0', '#ef5d8a', '#10b981'];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo" style={{ background: color }}>
              <FolderPlus size={16} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>New Folder</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Work Documents, Photos 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                padding: '0 14px',
                color: 'var(--ink)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Description
            </label>
            <input
              type="text"
              placeholder="A private Telegram group"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                padding: '0 14px',
                color: 'var(--ink)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Folder Color
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {folderColors.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid var(--ink)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {color === c && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--muted)',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={isTelegramGroup}
              onChange={(e) => setIsTelegramGroup(e.target.checked)}
              style={{ accentColor: 'var(--blue)' }}
            />
            <span>Sync as Telegram Private Storage Channel</span>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 9999,
                border: '1px solid var(--line)',
                background: 'var(--chip)',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pill b"
              style={{ flex: 1, height: 46, margin: 0, width: 'auto' }}
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =================== Upload Files Modal ===================
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: CloudFolder[];
  onUploadFiles: (files: FileList | File[], folderId?: string, tag?: TagName) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, folders, onUploadFiles }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<TagName>('Work');
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePickFiles = async () => {
    setUploadError(null);
    try {
      const files = await DeviceStorageService.pickFiles({ multiple: true });
      if (files.length > 0) {
        setPickedFiles((prev) => [...prev, ...files]);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to pick files from device.');
    }
  };

  const handlePickFolder = async () => {
    setUploadError(null);
    try {
      const files = await DeviceStorageService.pickFolder();
      if (files.length > 0) {
        setPickedFiles((prev) => [...prev, ...files]);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to pick folder from device.');
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickedFiles.length === 0) {
      setUploadError('Please select at least one file or folder from your device first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await DeviceStorageService.uploadFiles(
        pickedFiles,
        selectedFolderId || undefined,
        selectedTag,
        (prog) => setProgressInfo(prog)
      );

      // Trigger legacy update callback if needed
      onUploadFiles(
        pickedFiles.map((p) => p.file),
        selectedFolderId || undefined,
        selectedTag
      );

      setPickedFiles([]);
      setProgressInfo(null);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Upload to TELZO CLOUD failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={isUploading ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo">
              <Upload size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Upload to Cloud</h2>
              <small style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                {DeviceStorageService.isAndroidNative() ? 'Android SAF Active' : 'Web Device Access Active'}
              </small>
            </div>
          </div>
          {!isUploading && (
            <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {uploadError && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            {uploadError}
          </div>
        )}

        <form onSubmit={handleStartUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Browse Device Action Row */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Browse Device Storage
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handlePickFiles}
                disabled={isUploading}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                  background: 'var(--chip)',
                  color: 'var(--ink)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Smartphone size={16} />
                <span>Select Files</span>
              </button>

              <button
                type="button"
                onClick={handlePickFolder}
                disabled={isUploading}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                  background: 'var(--chip)',
                  color: 'var(--ink)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <FolderPlus size={16} />
                <span>Select Folder</span>
              </button>
            </div>
          </div>

          {/* Selected File List */}
          {pickedFiles.length > 0 && (
            <div
              style={{
                maxHeight: 120,
                overflowY: 'auto',
                background: 'var(--bg)',
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span>{pickedFiles.length} item(s) selected</span>
                <button
                  type="button"
                  onClick={() => setPickedFiles([])}
                  disabled={isUploading}
                  style={{ background: 'none', border: 0, color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                >
                  Clear all
                </button>
              </div>
              {pickedFiles.map((pf, idx) => (
                <div key={idx} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    {pf.relativePath || pf.name}
                  </span>
                  <span>{(pf.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          )}

          {/* Realtime Progress Indicator */}
          {isUploading && progressInfo && (
            <div
              style={{
                background: 'var(--chip)',
                padding: '12px 14px',
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span>
                  Uploading {progressInfo.fileIndex}/{progressInfo.totalFiles}: {progressInfo.fileName}
                </span>
                <span>{progressInfo.percent}%</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--line)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressInfo.percent}%`,
                    height: '100%',
                    background: 'var(--blue)',
                    transition: 'width 0.15s ease',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Target Folder (Optional)
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              disabled={isUploading}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                padding: '0 14px',
                color: 'var(--ink)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              <option value="">Root / Unassigned</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Tag
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['Work', 'Personal', 'Design', 'Important'] as TagName[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  disabled={isUploading}
                  onClick={() => setSelectedTag(t)}
                  className={`tag ${selectedTag === t ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <i style={{ background: TAG_COLORS[t] }} />
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 9999,
                border: '1px solid var(--line)',
                background: 'var(--chip)',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: 14,
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || pickedFiles.length === 0}
              className="pill b"
              style={{
                flex: 1,
                height: 46,
                margin: 0,
                width: 'auto',
                opacity: isUploading || pickedFiles.length === 0 ? 0.6 : 1,
              }}
            >
              {isUploading ? 'Uploading to Cloud...' : 'Upload to Cloud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =================== File / Photo Preview Modal ===================
interface FilePreviewModalProps {
  file: CloudFile | null;
  onClose: () => void;
  onToggleStar: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onChangeTag: (id: string, tag: TagName) => void;
  folders: CloudFolder[];
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onToggleStar,
  onDeleteFile,
  onChangeTag,
  folders,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!file) return null;

  const folder = folders.find((f) => f.id === file.folderId);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await DeviceStorageService.downloadFile(file.id, file.name, file.mimeType);
    } catch (err) {
      console.warn('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
            {file.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {file.isImage && (
          <div
            style={{
              width: '100%',
              maxHeight: 280,
              borderRadius: 18,
              overflow: 'hidden',
              background: '#000',
              marginBottom: 16,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <img
              src={file.url && (file.url.startsWith('blob:') || file.url.startsWith('http')) ? file.url : `/api/files/${file.id}/download`}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Size:</span>
            <b style={{ color: 'var(--ink)' }}>{(Number(file.size || 0) / (1024 * 1024)).toFixed(2)} MB</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Folder:</span>
            <b style={{ color: 'var(--ink)' }}>{folder ? folder.name : 'Root / No folder'}</b>
          </div>
          {file.telegramChannelId && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Telegram Channel:</span>
              <b style={{ color: 'var(--blue)' }}>ID {file.telegramChannelId}</b>
            </div>
          )}
          {file.telegramMessageId && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Telegram Message:</span>
              <b style={{ color: 'var(--ink)' }}>#{file.telegramMessageId}</b>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Uploaded:</span>
            <b style={{ color: 'var(--ink)' }}>{file.createdAt ? new Date(file.createdAt).toLocaleString() : 'Just now'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tag:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Work', 'Personal', 'Design', 'Important'] as TagName[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onChangeTag(file.id, t)}
                  style={{
                    border: file.tag === t ? '1.5px solid var(--ink)' : '1px solid transparent',
                    background: file.tag === t ? 'var(--chip)' : 'transparent',
                    borderRadius: 9999,
                    padding: '3px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <i style={{ width: 6, height: 6, borderRadius: '50%', background: TAG_COLORS[t] }} />
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onToggleStar(file.id)}
            className="pill"
            style={{
              flex: 1,
              background: 'var(--chip)',
              color: file.starred ? '#d97706' : 'var(--ink)',
              height: 44,
              fontSize: 13,
            }}
          >
            <Star size={16} fill={file.starred ? '#d97706' : 'none'} />
            <span>{file.starred ? 'Starred' : 'Star'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="pill"
            style={{ flex: 1, background: 'var(--chip)', color: 'var(--ink)', height: 44, fontSize: 13 }}
          >
            <Download size={16} />
            <span>{isDownloading ? 'Saving...' : 'Download to Device'}</span>
          </button>

          <button
            onClick={() => {
              onDeleteFile(file.id);
              onClose();
            }}
            className="pill"
            style={{
              background: '#fee2e2',
              color: '#ef4444',
              height: 44,
              padding: '0 14px',
            }}
            title="Move to Trash"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =================== Telegram Connect Modal ===================
const COUNTRY_CODES = [
  { flag: '🇧🇩', code: '+880', country: 'Bangladesh' },
  { flag: '🇺🇸', code: '+1', country: 'United States' },
  { flag: '🇬🇧', code: '+44', country: 'United Kingdom' },
  { flag: '🇮🇳', code: '+91', country: 'India' },
  { flag: '🇵🇰', code: '+92', country: 'Pakistan' },
  { flag: '🇨🇦', code: '+1', country: 'Canada' },
  { flag: '🇦🇺', code: '+61', country: 'Australia' },
  { flag: '🇩🇪', code: '+49', country: 'Germany' },
  { flag: '🇫🇷', code: '+33', country: 'France' },
  { flag: '🇦🇪', code: '+971', country: 'UAE' },
  { flag: '🇸🇦', code: '+966', country: 'Saudi Arabia' },
  { flag: '🇸🇬', code: '+65', country: 'Singapore' },
  { flag: '🇲🇾', code: '+60', country: 'Malaysia' },
  { flag: '🇳🇵', code: '+977', country: 'Nepal' },
];

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TelegramUser;
  onSignIn: (username: string, displayName: string) => Promise<unknown> | void;
  onSignOut: () => void;
  onRefreshData?: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignIn,
  onSignOut,
  onRefreshData,
}) => {
  const [screen, setScreen] = useState<'landing' | 'phone' | 'code' | 'password' | 'ready'>('landing');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [oidcStatus, setOidcStatus] = useState<{
    configured: boolean;
    authenticated: boolean;
    identity?: { sub: string; username?: string; name?: string };
  } | null>(null);

  const [tdlibStatus, setTdlibStatus] = useState<{
    configured: boolean;
    tdlibReady: boolean;
    authState: string;
    user?: { id: number; username?: string; firstName?: string; lastName?: string; phone?: string };
    indexChannelId?: string;
    folderCount?: number;
  } | null>(null);

  const checkStatuses = async () => {
    try {
      const [oRes, tRes] = await Promise.all([
        fetch('/api/auth/telegram/status').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/telegram/status').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (oRes) setOidcStatus(oRes);
      if (tRes) {
        setTdlibStatus(tRes);
        if (tRes.tdlibReady) {
          setScreen('ready');
        } else if (tRes.authState === 'waitCode') {
          setScreen('code');
        } else if (tRes.authState === 'waitPassword') {
          setScreen('password');
        }
      }
    } catch (e) {
      console.warn('[TELZO] Status check warning:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      checkStatuses();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const isConnected = user.isSignedIn || tdlibStatus?.tdlibReady;

  const handleSendPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.trim().replace(/^0+/, '');
    if (!cleanNumber) {
      setError('Please enter your phone number.');
      return;
    }
    const fullPhone = `${selectedCountry.code}${cleanNumber}`;
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send verification code.');
      }
      setScreen(data.authState === 'waitPassword' ? 'password' : 'code');
      setSuccessMsg('Verification code sent! Please check your official Telegram app.');
      checkStatuses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authorization request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      setError('Please enter the verification code sent to your Telegram account.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid verification code.');
      }
      if (data.authState === 'waitPassword') {
        setScreen('password');
        setSuccessMsg('Two-factor password required. Enter your Telegram 2FA cloud password.');
      } else if (data.authState === 'ready') {
        setScreen('ready');
        setSuccessMsg('Telegram Cloud Storage successfully connected!');
        if (onRefreshData) onRefreshData();
        checkStatuses();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your 2FA cloud password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid 2FA password.');
      }
      if (data.authState === 'ready') {
        setScreen('ready');
        setSuccessMsg('Telegram Cloud Storage connected!');
        if (onRefreshData) onRefreshData();
        checkStatuses();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanRecovery = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/recovery/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Scan failed.');
      }
      setSuccessMsg(`Index scanned: ${data.scannedFolders?.length || 0} folder channels discovered.`);
      if (onRefreshData) onRefreshData();
      checkStatuses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan and recovery failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await fetch('/api/telegram/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout warning:', e);
    }
    onSignOut();
    setOidcStatus(null);
    setTdlibStatus(null);
    setScreen('landing');
    onClose();
  };

  const userInitials = (tdlibStatus?.user?.firstName || user.displayName || user.username || 'TG')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#f2f2ef',
          borderRadius: 28,
          padding: '24px 22px 28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          color: '#0f172a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Active Connected Dashboard */}
        {isConnected || screen === 'ready' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#5085f8',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <PlaneIcon size={18} color="#fff" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Telegram Cloud Engine</h2>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  color: '#16a34a',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {successMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: 16,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#0f172a',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {userInitials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 15, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tdlibStatus?.user
                      ? `${tdlibStatus.user.firstName || ''} ${tdlibStatus.user.lastName || ''}`.trim()
                      : user.displayName || user.username}
                  </b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    @{tdlibStatus?.user?.username || user.username || 'telegram_user'}
                  </span>
                </div>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 9999,
                  }}
                >
                  Online
                </span>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>OIDC Identity</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}>
                    <Shield size={14} /> Verified (PKCE S256)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>TDLib Native Engine</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}>
                    <CheckCircle2 size={14} /> Active
                  </span>
                </div>
                {tdlibStatus?.indexChannelId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Index Channel</span>
                    <span style={{ color: '#5085f8', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>
                      ID {tdlibStatus.indexChannelId}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Folder Architecture</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>1 Private Channel / Folder</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleScanRecovery}
                  disabled={isScanning}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 14,
                    border: 'none',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
                  <span>{isScanning ? 'Scanning...' : 'Scan & Recover Index'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    height: 44,
                    padding: '0 16px',
                    borderRadius: 14,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'transparent',
                    color: '#ef4444',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : screen === 'landing' ? (
          /* SCREEN 1: LANDING VIEW (Matches Screenshot 1) */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              {/* Telegram Blue Circle Icon */}
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 6px 16px rgba(80, 133, 248, 0.35)',
                }}
              >
                <PlaneIcon size={24} color="#ffffff" />
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.12,
                letterSpacing: '-0.5px',
                marginBottom: 12,
                fontFamily: 'inherit',
              }}
            >
              Your Telegram,
              <br />
              as a cloud drive.
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 14,
                color: '#64748b',
                lineHeight: 1.48,
                marginBottom: 24,
                fontWeight: 500,
              }}
            >
              Sign in once. Your files live in your own Telegram account — Telefy keeps the folders.
            </p>

            {/* 3 Feature Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {/* Private */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <Lock size={18} color="#0f172a" />
                </div>
                <div>
                  <b style={{ fontSize: 14, fontWeight: 700, display: 'block', color: '#0f172a' }}>
                    Private
                  </b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Only you can see your files</span>
                </div>
              </div>

              {/* Everywhere */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <Monitor size={18} color="#0f172a" />
                </div>
                <div>
                  <b style={{ fontSize: 14, fontWeight: 700, display: 'block', color: '#0f172a' }}>
                    Everywhere
                  </b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Phone, web, Mac and iPhone</span>
                </div>
              </div>

              {/* Free */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <Cloud size={18} color="#0f172a" />
                </div>
                <div>
                  <b style={{ fontSize: 14, fontWeight: 700, display: 'block', color: '#0f172a' }}>
                    Free
                  </b>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    Uses the storage Telegram gives you
                  </span>
                </div>
              </div>
            </div>

            {/* Black CTA Button */}
            <button
              onClick={() => {
                setError(null);
                setScreen('phone');
              }}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 9999,
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
                transition: 'transform 0.1s ease',
              }}
            >
              <PlaneIcon size={18} color="#ffffff" />
              <span>Connect Telegram</span>
            </button>
          </div>
        ) : screen === 'phone' ? (
          /* SCREEN 2: PHONE INPUT VIEW (Matches Screenshot 2) */
          <div>
            {/* Top Bar with Back Arrow and Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button
                onClick={() => {
                  setError(null);
                  setScreen('landing');
                }}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#0f172a',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Back"
              >
                <ArrowLeft size={22} />
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Blue Cloud Squircle Icon in Center */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 8px 20px rgba(80, 133, 248, 0.3)',
                }}
              >
                <Cloud size={36} color="#ffffff" fill="#ffffff" />
              </div>
            </div>

            {/* Heading & Subtitle */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Connect Telegram
            </h2>

            <p
              style={{
                fontSize: 13,
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 1.45,
                marginBottom: 24,
                padding: '0 6px',
              }}
            >
              Sign in to your own Telegram account. Telefy Cloud uses your Saved Messages as private cloud storage — your files stay in your account.
            </p>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {/* Phone Input Form */}
            <form onSubmit={handleSendPhone} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Row with Country Code Picker and Floating Label Phone Input */}
              <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
                {/* Country Code Button */}
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown((prev) => !prev)}
                  style={{
                    height: 52,
                    padding: '0 12px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#e5e5e2',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <ChevronDown size={14} color="#64748b" />
                </button>

                {/* Country Dropdown Menu */}
                {showCountryDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 56,
                      left: 0,
                      width: 220,
                      maxHeight: 200,
                      overflowY: 'auto',
                      background: '#ffffff',
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 50,
                      padding: 6,
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code + c.country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowCountryDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: selectedCountry.code === c.code ? '#f1f5f9' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          fontWeight: selectedCountry.code === c.code ? 700 : 500,
                          color: '#0f172a',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{c.flag}</span>
                        <span style={{ flex: 1 }}>{c.country}</span>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Outlined Phone Input Field with Floating Label */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <label
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: 12,
                      background: '#f2f2ef',
                      padding: '0 5px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0f172a',
                      zIndex: 2,
                    }}
                  >
                    Phone number
                  </label>
                  <input
                    type="tel"
                    placeholder="01712 345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      height: 52,
                      borderRadius: 14,
                      border: '2px solid #0f172a',
                      background: 'transparent',
                      padding: '0 14px',
                      color: '#0f172a',
                      fontSize: 15,
                      fontWeight: 600,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Subtext */}
              <p
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  margin: '2px 0 12px',
                  lineHeight: 1.4,
                }}
              >
                Type your number the normal way — no need to add {selectedCountry.code}. Telegram will send you a login code.
              </p>

              {/* Send Code Action Button */}
              <button
                type="submit"
                disabled={isLoading || !phoneNumber.trim()}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: phoneNumber.trim() ? '#0f172a' : '#d4d4d0',
                  color: phoneNumber.trim() ? '#ffffff' : '#888884',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: phoneNumber.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s ease',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <span>{isLoading ? 'Sending Code...' : 'Send code'}</span>
              </button>
            </form>
          </div>
        ) : screen === 'code' ? (
          /* CODE VERIFICATION VIEW */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button
                onClick={() => {
                  setError(null);
                  setScreen('phone');
                }}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#0f172a',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ArrowLeft size={22} />
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 8px 20px rgba(80, 133, 248, 0.3)',
                }}
              >
                <Key size={34} color="#ffffff" />
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              Enter Code
            </h2>

            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.45, marginBottom: 24 }}>
              Telegram sent a login code to your official Telegram app. Enter it below to authorize.
            </p>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <label
                  style={{
                    position: 'absolute',
                    top: -9,
                    left: 12,
                    background: '#f2f2ef',
                    padding: '0 5px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0f172a',
                    zIndex: 2,
                  }}
                >
                  Login code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    border: '2px solid #0f172a',
                    background: 'transparent',
                    padding: '0 14px',
                    color: '#0f172a',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 4,
                    textAlign: 'center',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !authCode.trim()}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: authCode.trim() ? '#0f172a' : '#d4d4d0',
                  color: authCode.trim() ? '#ffffff' : '#888884',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: authCode.trim() && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
        ) : (
          /* PASSWORD 2FA VIEW */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button
                onClick={() => {
                  setError(null);
                  setScreen('code');
                }}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#0f172a',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ArrowLeft size={22} />
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: '#5085f8',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 8px 20px rgba(80, 133, 248, 0.3)',
                }}
              >
                <Lock size={34} color="#ffffff" />
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              2FA Password
            </h2>

            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.45, marginBottom: 24 }}>
              Your Telegram account is protected with a 2FA cloud password. Enter it below to complete sign in.
            </p>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <label
                  style={{
                    position: 'absolute',
                    top: -9,
                    left: 12,
                    background: '#f2f2ef',
                    padding: '0 5px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0f172a',
                    zIndex: 2,
                  }}
                >
                  2FA Password
                </label>
                <input
                  type="password"
                  placeholder="Enter 2FA password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    border: '2px solid #0f172a',
                    background: 'transparent',
                    padding: '0 14px',
                    color: '#0f172a',
                    fontSize: 15,
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  background: password ? '#0f172a' : '#d4d4d0',
                  color: password ? '#ffffff' : '#888884',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: password && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? 'Verifying Password...' : 'Verify 2FA Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// =================== Trash Modal ===================
interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashFiles: CloudFile[];
  onRestore: (id: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashFiles,
  onRestore,
  onEmptyTrash,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo" style={{ background: '#ef4444' }}>
              <Trash2 size={16} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Trash ({trashFiles.length})</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {trashFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Trash is empty</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Deleted files will appear here before permanent removal.</p>
          </div>
        ) : (
          <div>
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trashFiles.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: 'var(--bg)',
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <b style={{ fontSize: 14, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </b>
                    <small style={{ color: 'var(--muted)' }}>{(f.size / (1024 * 1024)).toFixed(2)} MB</small>
                  </div>
                  <button
                    onClick={() => onRestore(f.id)}
                    className="round"
                    title="Restore file"
                    aria-label="Restore"
                    style={{ width: 34, height: 34, marginLeft: 8 }}
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={onEmptyTrash}
              style={{
                width: '100%',
                marginTop: 16,
                height: 44,
                borderRadius: 9999,
                border: '1px solid #fee2e2',
                background: '#fef2f2',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Empty Trash Permanently
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =================== Help & About Modal ===================
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo">
              <PlaneIcon size={16} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>About Telzo Cloud</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
          <p>
            <b style={{ color: 'var(--ink)' }}>Telzo Cloud</b> turns your Telegram account into an unlimited, ultra-fast personal cloud storage service.
          </p>
          <div>
            <b style={{ color: 'var(--ink)', display: 'block', marginBottom: 4 }}>Key Features:</b>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><b>Unlimited Storage:</b> Files are saved in your private Telegram chats/channels without storage quotas.</li>
              <li><b>Offline & Browser Cache:</b> Files uploaded in this session are immediately available locally and mirrored.</li>
              <li><b>Photos & Starred:</b> Quick access to favorite captures and essential documents with tagging support.</li>
              <li><b>Private & Secure:</b> You own the encryption and access rights directly through your Telegram identity.</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="pill b"
          style={{ width: '100%', marginTop: 20, height: 44 }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

// =================== Shared Links Modal ===================
interface SharedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharedModal: React.FC<SharedModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo" style={{ background: '#8b6cf0' }}>
              <Share2 size={16} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Shared Links</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Share individual files or whole folders as direct Telegram web links or protected cloud downloads.
        </p>

        <div style={{ background: 'var(--bg)', borderRadius: 16, padding: 14, marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Public Share Link:</span>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginTop: 4, wordBreak: 'break-all' }}>
            https://t.me/telzo_cloud_bot?start=share_973528f7
          </p>
        </div>

        <button
          onClick={onClose}
          className="pill b"
          style={{ width: '100%', marginTop: 20, height: 44 }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
