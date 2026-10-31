import crypto from 'crypto';

export interface BackendFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isTelegramGroup?: boolean;
  createdAt: number;
}

export interface BackendFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  folderId?: string;
  tag?: string;
  starred: boolean;
  createdAt: number;
  isImage: boolean;
  telegramMessageId?: number;
}

// In-memory backend repository for folders and files
class StorageService {
  private folders: Map<string, BackendFolder> = new Map();
  private files: Map<string, BackendFile> = new Map();

  constructor() {
    // Starts empty as requested - no fake data
  }

  // Folder operations
  public getFolders(): BackendFolder[] {
    return Array.from(this.folders.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public createFolder(data: {
    name: string;
    description?: string;
    color?: string;
    isTelegramGroup?: boolean;
  }): BackendFolder {
    const id = `fld_${crypto.randomUUID()}`;
    const folder: BackendFolder = {
      id,
      name: data.name.trim(),
      description: data.description?.trim(),
      color: data.color || '#5a8bff',
      isTelegramGroup: Boolean(data.isTelegramGroup),
      createdAt: Date.now(),
    };
    this.folders.set(id, folder);
    return folder;
  }

  public getFolderById(id: string): BackendFolder | undefined {
    return this.folders.get(id);
  }

  // File operations
  public getFiles(folderId?: string): BackendFile[] {
    const all = Array.from(this.files.values()).sort((a, b) => b.createdAt - a.createdAt);
    if (folderId) {
      return all.filter((f) => f.folderId === folderId);
    }
    return all;
  }

  public saveUploadedFile(file: {
    originalname: string;
    size: number;
    mimetype: string;
    folderId?: string;
    tag?: string;
  }): BackendFile {
    const id = `fil_${crypto.randomUUID()}`;
    const isImage = file.mimetype.startsWith('image/');

    const newFile: BackendFile = {
      id,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      folderId: file.folderId,
      tag: file.tag,
      starred: false,
      createdAt: Date.now(),
      isImage,
    };

    this.files.set(id, newFile);
    return newFile;
  }
}

export const storageService = new StorageService();
