import React, { useState } from 'react';
import {
  Folder,
  Search,
  MoreVertical,
  SlidersHorizontal,
  LayoutGrid,
  List,
  FileText,
  Film,
  Music as MusicIcon,
  Image as ImageIcon,
  Star,
  Plus,
} from 'lucide-react';
import { CloudFile, CloudFolder } from '../types';

interface FilesViewProps {
  files: CloudFile[];
  folders: CloudFolder[];
  onToggleStar: (fileId: string) => void;
  onOpenFilePreview: (file: CloudFile) => void;
  onOpenUpload: () => void;
}

export const FilesView: React.FC<FilesViewProps> = ({
  files,
  folders,
  onToggleStar,
  onOpenFilePreview,
  onOpenUpload,
}) => {
  const [search, setSearch] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Map real user folders loaded from backend/database
  const userFolderItems = folders.map((f) => ({
    id: f.id,
    name: f.name,
    date: formatDate(f.createdAt),
    isUserFolder: true,
    original: f,
  }));

  const filteredFolders = userFolderItems.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="view show" id="filesView">
      {/* Header matching exact screenshot typography & top action icons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Internal Storage
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="round"
            onClick={() => setShowSearchInput(!showSearchInput)}
            title="Search"
            aria-label="Search files"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              cursor: 'pointer',
            }}
          >
            <Search size={19} />
          </button>

          <button
            className="round"
            onClick={onOpenUpload}
            title="Upload file or folder"
            aria-label="Filter or upload"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={19} />
          </button>

          <button
            className="round"
            onClick={() => setIsGridView(!isGridView)}
            title="Toggle Grid / List View"
            aria-label="Toggle layout view"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              cursor: 'pointer',
            }}
          >
            {isGridView ? <List size={19} /> : <LayoutGrid size={19} />}
          </button>
        </div>
      </div>

      {/* Toggleable Search Bar */}
      {showSearchInput && (
        <div className="search" style={{ marginTop: 0, marginBottom: 18 }}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search internal storage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* Content View: Folders & Files */}
      {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 24,
            padding: '44px 20px',
            textAlign: 'center',
            border: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 10,
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#e8f1ff',
              display: 'grid',
              placeItems: 'center',
              color: '#3b82f6',
            }}
          >
            <Folder size={28} />
          </div>
          <b style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 700 }}>
            {search ? 'No matching files or folders' : 'No files yet'}
          </b>
          <span style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 310, lineHeight: 1.45 }}>
            {search
              ? `No items found matching "${search}".`
              : 'Your cloud storage is currently empty. Upload files or select a folder to get started.'}
          </span>
          {!search && (
            <button
              onClick={onOpenUpload}
              style={{
                marginTop: 8,
                background: 'var(--ink)',
                color: 'var(--bg)',
                padding: '12px 24px',
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: 0,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <Plus size={18} />
              <span>Browse Device</span>
            </button>
          )}
        </div>
      ) : (
        <div className={isGridView ? 'folders-grid' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Folders List */}
          {filteredFolders.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--card)',
                borderRadius: 22,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => {
                if (item.isUserFolder && item.original) {
                  // handle folder click
                }
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 16,
                  background: '#e8f1ff',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Folder size={24} style={{ fill: '#3b82f6', color: '#3b82f6' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <b
                  style={{
                    display: 'block',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.name}
                </b>
                <span style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, display: 'block' }}>
                  {item.date}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === item.id ? null : item.id);
                }}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 6,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                }}
                aria-label="Options"
              >
                <MoreVertical size={20} />
              </button>

              {/* Menu Popover */}
              {activeMenuId === item.id && (
                <div
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 50,
                    background: 'var(--card)',
                    borderRadius: 14,
                    padding: '8px 0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--line)',
                    zIndex: 20,
                    minWidth: 140,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onOpenUpload();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 14px',
                      border: 0,
                      background: 'none',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    Upload File Here
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Dynamic Files List */}
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              style={{
                background: 'var(--card)',
                borderRadius: 22,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => onOpenFilePreview(file)}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 16,
                  background: file.isImage ? '#e0f2fe' : '#f3e8ff',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {file.isImage ? (
                  <ImageIcon size={22} style={{ color: '#0284c7' }} />
                ) : file.mimeType.startsWith('video/') ? (
                  <Film size={22} style={{ color: '#d97706' }} />
                ) : file.mimeType.startsWith('audio/') ? (
                  <MusicIcon size={22} style={{ color: '#9333ea' }} />
                ) : (
                  <FileText size={22} style={{ color: '#2563eb' }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <b
                  style={{
                    display: 'block',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {file.name}
                </b>
                <span style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, display: 'block' }}>
                  {formatDate(file.createdAt)} · {(Number(file.size || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(file.id);
                }}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: file.starred ? '#ffc94a' : 'var(--muted)',
                  padding: 6,
                }}
                aria-label="Star file"
              >
                <Star size={18} fill={file.starred ? '#ffc94a' : 'none'} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFilePreview(file);
                }}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 6,
                }}
                aria-label="Options"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

