import React, { useRef } from 'react';
import { Upload, Star, Image as ImageIcon } from 'lucide-react';
import { CloudFile } from '../types';

interface PhotosViewProps {
  files: CloudFile[];
  onAddPhotos: (fileList: FileList) => void;
  onToggleStar: (fileId: string) => void;
  onOpenFilePreview: (file: CloudFile) => void;
}

export const PhotosView: React.FC<PhotosViewProps> = ({
  files,
  onAddPhotos,
  onToggleStar,
  onOpenFilePreview,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoFiles = files.filter((f) => f.isImage);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPhotos(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <main className="view show" id="photos">
      <h1>Photos</h1>
      <p className="sub">Images from your files.</p>

      <button
        className="pill b add"
        id="addPhotos"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={18} />
        <span>Add photos</span>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        hidden
        onChange={handleFileChange}
      />

      {photoFiles.length > 0 ? (
        <div className="grid" id="photoGrid">
          {photoFiles.map((p) => (
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
                className={`star-btn ${p.starred ? 'on' : ''}`}
                aria-label={p.starred ? 'Remove star' : 'Star photo'}
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
      ) : (
        <section className="card zero" id="photoEmpty" style={{ marginTop: 24 }}>
          <span className="ic">
            <ImageIcon size={24} />
          </span>
          <b>No photos yet</b>
          <span>Add photos to see them here.</span>
        </section>
      )}
    </main>
  );
};
