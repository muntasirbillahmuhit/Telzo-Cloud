import React from 'react';
import { Star, FileText, ChevronRight } from 'lucide-react';
import { CloudFile } from '../types';

interface StarredViewProps {
  files: CloudFile[];
  onToggleStar: (fileId: string) => void;
  onOpenFilePreview: (file: CloudFile) => void;
}

export const StarredView: React.FC<StarredViewProps> = ({
  files,
  onToggleStar,
  onOpenFilePreview,
}) => {
  const starredFiles = files.filter((f) => f.starred);
  const starredPhotos = starredFiles.filter((f) => f.isImage);
  const starredDocs = starredFiles.filter((f) => !f.isImage);

  return (
    <main className="view show" id="starred">
      <h1>Starred</h1>
      <p className="sub">Files and folders you’ve starred.</p>

      {starredPhotos.length > 0 && (
        <div className="grid" id="starGrid" style={{ marginTop: 20 }}>
          {starredPhotos.map((p) => (
            <div
              key={p.id}
              className="ph"
              onClick={() => onOpenFilePreview(p)}
            >
              <img
                src={p.url}
                alt={p.name || 'Photo'}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0.3';
                }}
              />
              <button
                className="star-btn on"
                aria-label="Remove star"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(p.id);
                }}
              >
                <Star size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {starredDocs.length > 0 && (
        <section className="card lib" style={{ marginTop: 16 }}>
          <h2>Starred Documents</h2>
          <div style={{ marginTop: 8 }}>
            {starredDocs.map((f) => (
              <div
                key={f.id}
                className="item"
                onClick={() => onOpenFilePreview(f)}
              >
                <span className="ic">
                  <FileText size={18} />
                </span>
                <div>
                  <b>{f.name}</b>
                  <small>
                    {(f.size / (1024 * 1024)).toFixed(2)} MB · {f.tag || 'General'}
                  </small>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(f.id);
                  }}
                  style={{
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                    color: '#ffc94a',
                    padding: 8,
                  }}
                  aria-label="Remove star"
                >
                  <Star size={18} fill="#ffc94a" />
                </button>
                <ChevronRight className="chev" />
              </div>
            ))}
          </div>
        </section>
      )}

      {starredFiles.length === 0 && (
        <section className="card zero" id="starEmpty">
          <span className="ic">
            <Star size={24} />
          </span>
          <b>Nothing starred yet</b>
          <span>Tap the star on a photo or file to find it here.</span>
        </section>
      )}
    </main>
  );
};
