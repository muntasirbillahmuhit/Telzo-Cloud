import React, { useState } from 'react';
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
} from 'lucide-react';
import { PlaneIcon } from './PlaneIcon';
import { CloudFile, CloudFolder, TagName, TAG_COLORS, TelegramUser } from '../types';

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
  onUploadFiles: (files: FileList, folderId?: string, tag?: TagName) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, folders, onUploadFiles }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<TagName>('Work');
  const [selectedFileList, setSelectedFileList] = useState<FileList | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileList || selectedFileList.length === 0) return;
    onUploadFiles(selectedFileList, selectedFolderId || undefined, selectedTag);
    setSelectedFileList(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo">
              <Upload size={16} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Upload to Cloud</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Select Files
            </label>
            <input
              type="file"
              multiple
              required
              onChange={(e) => setSelectedFileList(e.target.files)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 14,
                border: '1px dashed var(--line)',
                background: 'var(--bg)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            />
            {selectedFileList && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {selectedFileList.length} {selectedFileList.length === 1 ? 'file' : 'files'} selected
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              Target Folder (Optional)
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
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
              Start Upload
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
  if (!file) return null;

  const folder = folders.find((f) => f.id === file.folderId);

  const handleDownload = () => {
    if (!file.url || file.url === '#' || file.url.startsWith('javascript:')) return;
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
              src={file.url}
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
            className="pill"
            style={{ flex: 1, background: 'var(--chip)', color: 'var(--ink)', height: 44, fontSize: 13 }}
          >
            <Download size={16} />
            <span>Download</span>
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
interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TelegramUser;
  onSignIn: (username: string, displayName: string) => void;
  onSignOut: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignIn,
  onSignOut,
}) => {
  const [handle, setHandle] = useState(user.username || '');
  const [name, setName] = useState(user.displayName || '');

  if (!isOpen) return null;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    onSignIn(handle.replace('@', '').trim(), name.trim() || handle.replace('@', '').trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo" style={{ background: '#5a8bff' }}>
              <PlaneIcon size={16} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Telegram Cloud</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {user.isSignedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                background: 'var(--chip)',
                padding: 16,
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--navy)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                }}
              >
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15, display: 'block' }}>{user.displayName}</b>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>@{user.username}</span>
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
                Active
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Your files and photos are mirrored to your private Telegram Saved Messages and dedicated channel. Unlimited cloud storage is active!
            </p>

            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              style={{
                height: 44,
                borderRadius: 9999,
                border: '1px solid #fee2e2',
                background: '#fff',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Disconnect Telegram
            </button>
          </div>
        ) : (
          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
              Connect your Telegram account to enjoy unlimited cloud storage powered by Telegram's distributed cloud infrastructure.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                Telegram Username
              </label>
              <input
                type="text"
                placeholder="@username"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
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
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Smith"
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

            <button
              type="submit"
              className="signin"
              style={{ marginTop: 8 }}
            >
              <PlaneIcon size={18} />
              <span>Sign in with Telegram</span>
            </button>
          </form>
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
