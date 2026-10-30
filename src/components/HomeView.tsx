import React, { useMemo } from 'react';
import { Search, Upload, FolderPlus, Folder, FileText, ChevronRight, X } from 'lucide-react';
import { PlaneIcon } from './PlaneIcon';
import { CloudFile, CloudFolder, TelegramUser } from '../types';

interface HomeViewProps {
  files: CloudFile[];
  folders: CloudFolder[];
  user: TelegramUser;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenUpload: () => void;
  onOpenNewFolder: () => void;
  onSelectFolder: (folderId: string | null) => void;
  selectedFolderId: string | null;
  onOpenFilePreview: (file: CloudFile) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  files,
  folders,
  user,
  searchQuery,
  setSearchQuery,
  onOpenUpload,
  onOpenNewFolder,
  onSelectFolder,
  selectedFolderId,
  onOpenFilePreview,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filter files by name in real-time as the user types
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (!f) return false;
      const fileName = f.name || '';
      const matchesSearch = normalizedQuery
        ? fileName.toLowerCase().includes(normalizedQuery)
        : true;
      const matchesFolder = selectedFolderId ? f.folderId === selectedFolderId : true;
      return matchesSearch && matchesFolder;
    });
  }, [files, normalizedQuery, selectedFolderId]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const renderHighlightedName = (name: string | undefined, query: string) => {
    if (!name) return '';
    if (!query) return name;
    const lowerName = name.toLowerCase();
    const index = lowerName.indexOf(query);
    if (index === -1) return name;

    const before = name.substring(0, index);
    const match = name.substring(index, index + query.length);
    const after = name.substring(index + query.length);

    return (
      <>
        {before}
        <span
          style={{
            background: 'rgba(90, 139, 255, 0.22)',
            color: 'var(--blue)',
            fontWeight: 800,
            borderRadius: 3,
            padding: '1px 3px',
          }}
        >
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <main className="view show" id="home">
      <h1>{getGreeting()}</h1>

      <div className="search">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search your files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearchQuery('');
          }}
          autoComplete="off"
          spellCheck="false"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            style={{
              background: 'none',
              border: 0,
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Real-time search results card */}
      {normalizedQuery ? (
        <section className="card lib" style={{ marginTop: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <h2>
              Search Results
              <small style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8, fontWeight: 600 }}>
                {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
              </small>
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 0,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--blue)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ marginTop: 4 }}>
            {filteredFiles.length === 0 ? (
              <div style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--muted)' }}>
                <Search size={30} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                <b style={{ display: 'block', fontSize: 15, color: 'var(--ink)' }}>No files found</b>
                <span style={{ fontSize: 13 }}>No files matching "{searchQuery}"</span>
              </div>
            ) : (
              filteredFiles.map((f) => (
                <div
                  key={f.id}
                  className="item"
                  onClick={() => onOpenFilePreview(f)}
                >
                  <span className="ic">
                    {f.isImage ? (
                      <img
                        src={f.url}
                        alt={f.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <FileText size={18} />
                    )}
                  </span>
                  <div>
                    <b>{renderHighlightedName(f.name, normalizedQuery)}</b>
                    <small>
                      {(f.size / (1024 * 1024)).toFixed(2)} MB · {new Date(f.createdAt).toLocaleDateString()}
                      {f.tag && ` · ${f.tag}`}
                    </small>
                  </div>
                  <ChevronRight className="chev" />
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      <div className="hero">
        <PlaneIcon size={36} className="plane" />
        <div className="l">
          {user.isSignedIn ? `Synced with Telegram (@${user.username})` : 'In this browser'}
        </div>
        <div className="n">{files.length}</div>
        <div className="d">
          {files.length === 0 && folders.length === 0 && !user.isSignedIn
            ? 'files in 0 folders · sign in to sync with Telegram'
            : `${files.length} ${files.length === 1 ? 'file' : 'files'} in ${folders.length} ${folders.length === 1 ? 'folder' : 'folders'} · ${
                user.isSignedIn ? 'synced with Telegram cloud' : 'sign in to sync with Telegram'
              }`}
        </div>
        <div className="row">
          <button className="pill w" onClick={onOpenUpload}>
            <Upload size={18} />
            <span>Upload</span>
          </button>
          <button className="pill g" onClick={onOpenNewFolder}>
            <FolderPlus size={18} />
            <span>New folder</span>
          </button>
        </div>
      </div>

      {selectedFolderId && (
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card)',
            padding: '12px 18px',
            borderRadius: 18,
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Folder size={18} style={{ color: 'var(--blue)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Folder: {selectedFolder?.name || 'All'}
            </span>
          </div>
          <button
            onClick={() => onSelectFolder(null)}
            style={{
              background: 'none',
              border: 0,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="sec">
        <h2>
          Folders<small>{folders.length}</small>
        </h2>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectFolder(null);
          }}
        >
          See all &rarr;
        </a>
      </div>

      {folders.length === 0 ? (
        <div className="nf" onClick={onOpenNewFolder} role="button" tabIndex={0}>
          <div className="plus">+</div>
          <b>New folder</b>
          <span>A private Telegram group</span>
        </div>
      ) : (
        <div className="folders-grid">
          <div className="nf" onClick={onOpenNewFolder} role="button" tabIndex={0}>
            <div className="plus">+</div>
            <b>New folder</b>
            <span>A private Telegram group</span>
          </div>

          {folders.map((folder) => {
            const folderFilesCount = files.filter((f) => f.folderId === folder.id).length;
            const isSelected = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className="folder-card"
                style={{
                  borderColor: isSelected ? 'var(--blue)' : undefined,
                  background: isSelected ? 'rgba(90, 139, 255, 0.08)' : undefined,
                }}
                onClick={() => onSelectFolder(isSelected ? null : folder.id)}
              >
                <div
                  className="icon-box"
                  style={{
                    background: folder.color ? `${folder.color}15` : undefined,
                    color: folder.color || undefined,
                  }}
                >
                  <Folder size={20} />
                </div>
                <b>{folder.name}</b>
                <span>
                  {folderFilesCount} {folderFilesCount === 1 ? 'file' : 'files'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!normalizedQuery && files.length > 0 && (
        <section className="card lib" style={{ marginTop: 24 }}>
          <h2>{selectedFolderId ? `Files in ${selectedFolder?.name || 'Folder'}` : 'Recent Files'}</h2>
          <div style={{ marginTop: 8 }}>
            {filteredFiles.length === 0 ? (
              <p className="m" style={{ padding: '16px 0', textAlign: 'center' }}>
                No files found in this folder.
              </p>
            ) : (
              filteredFiles.slice(0, 10).map((f) => (
                <div
                  key={f.id}
                  className="item"
                  onClick={() => onOpenFilePreview(f)}
                >
                  <span className="ic">
                    {f.isImage ? (
                      <img
                        src={f.url}
                        alt={f.name || 'Image'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <FileText size={18} />
                    )}
                  </span>
                  <div>
                    <b>{f.name}</b>
                    <small>
                      {(Number(f.size || 0) / (1024 * 1024)).toFixed(2)} MB · {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'Recent'}
                      {f.tag && ` · ${f.tag}`}
                    </small>
                  </div>
                  <ChevronRight className="chev" />
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </main>
  );
};
