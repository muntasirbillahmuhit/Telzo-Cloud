import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { UserSession } from '../middleware/session.js';
import { TdlibService } from './tdlib.service.js';
import { dbService, FolderRecord as DBFolderRecord, FileRecord as DBFileRecord } from './db.service.js';
import { IsolationService } from './isolation.service.js';

export interface CloudFolderRecord {
  id: string; // Permanent UUID
  name: string;
  description?: string;
  color?: string;
  telegramChannelId?: string; // Dedicated private Telegram channel ID
  createdAt: number;
  status: 'active' | 'deleted';
}

export interface CloudFileRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  folderId?: string;
  telegramChannelId?: string;
  telegramMessageId?: number;
  tag?: string;
  starred: boolean;
  createdAt: number;
  isImage: boolean;
  localPath?: string;
}

export interface UserCloudIndex {
  userId: string;
  indexChannelId?: string;
  lastSyncedAt: number;
  folders: CloudFolderRecord[];
  files: CloudFileRecord[];
}

export class CloudStorageService {
  /**
   * Gets user-specific storage path
   */
  private static getUserStoragePath(userId: string) {
    const userDir = path.join(config.telegram.telzoDataDir, `user_${userId}`);
    const filesDir = path.join(userDir, 'files');
    const indexFilePath = path.join(userDir, 'cloud_index.json');

    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    return { userDir, filesDir, indexFilePath };
  }

  /**
   * Loads user cloud index from disk & SQLite database
   */
  public static getUserIndex(session: UserSession): UserCloudIndex {
    const userId = session.userId || session.sessionId;
    const { indexFilePath } = this.getUserStoragePath(userId);

    let foldersFromDb: CloudFolderRecord[] = dbService.getFoldersForUser(userId).map((f) => ({
      id: f.folder_id,
      name: f.name,
      description: f.description || undefined,
      color: f.color || undefined,
      telegramChannelId: f.telegram_channel_id || undefined,
      createdAt: f.created_at,
      status: (f.status as 'active' | 'deleted') || 'active',
    }));

    let filesFromDb: CloudFileRecord[] = dbService.getFilesForUser(userId).map((f) => ({
      id: f.file_id,
      name: f.name,
      size: f.size_bytes,
      mimeType: f.mime_type,
      folderId: f.folder_id || undefined,
      telegramChannelId: f.telegram_channel_id || undefined,
      telegramMessageId: f.telegram_message_id || undefined,
      tag: f.tag || undefined,
      starred: Boolean(f.starred),
      createdAt: f.created_at,
      isImage: f.mime_type.startsWith('image/'),
      localPath: f.local_path || undefined,
    }));

    if (fs.existsSync(indexFilePath)) {
      try {
        const raw = fs.readFileSync(indexFilePath, 'utf8');
        const diskIndex: UserCloudIndex = JSON.parse(raw);
        // Merge disk index with DB records
        if (diskIndex.folders.length > 0 && foldersFromDb.length === 0) {
          foldersFromDb = diskIndex.folders;
          for (const f of foldersFromDb) {
            dbService.saveFolder({
              folder_id: f.id,
              user_id: userId,
              name: f.name,
              description: f.description,
              color: f.color,
              telegram_channel_id: f.telegramChannelId,
              status: f.status,
              created_at: f.createdAt,
            });
          }
        }
        if (diskIndex.files.length > 0 && filesFromDb.length === 0) {
          filesFromDb = diskIndex.files;
          for (const f of filesFromDb) {
            dbService.saveFile({
              file_id: f.id,
              user_id: userId,
              folder_id: f.folderId,
              name: f.name,
              size_bytes: f.size,
              mime_type: f.mimeType,
              tag: f.tag,
              starred: f.starred ? 1 : 0,
              telegram_channel_id: f.telegramChannelId,
              telegram_message_id: f.telegramMessageId,
              local_path: f.localPath,
              status: 'active',
              created_at: f.createdAt,
            });
          }
        }
      } catch (err) {
        console.warn(`[CloudStorage] Error reading index for ${userId}:`, err);
      }
    }

    const index: UserCloudIndex = {
      userId,
      indexChannelId: session.indexChannelId,
      lastSyncedAt: Date.now(),
      folders: foldersFromDb,
      files: filesFromDb,
    };

    return index;
  }

  /**
   * Saves user cloud index to disk atomically
   */
  private static saveUserIndex(userId: string, index: UserCloudIndex) {
    const { indexFilePath } = this.getUserStoragePath(userId);
    const tempPath = `${indexFilePath}.tmp.${Date.now()}`;
    index.lastSyncedAt = Date.now();
    fs.writeFileSync(tempPath, JSON.stringify(index, null, 2), 'utf8');
    fs.renameSync(tempPath, indexFilePath);
  }

  /**
   * Retrieves all active folders for the user
   */
  public static getFolders(session: UserSession): CloudFolderRecord[] {
    const index = this.getUserIndex(session);
    return index.folders.filter((f) => f.status === 'active');
  }

  /**
   * Creates a folder with its own separate private Telegram channel
   */
  public static async createFolder(
    session: UserSession,
    name: string,
    description?: string,
    color?: string
  ): Promise<CloudFolderRecord> {
    const userId = session.userId || session.sessionId;
    const folderId = `folder_${crypto.randomUUID()}`;
    let telegramChannelId: string | undefined;

    // Create private channel via TDLib if authenticated
    if (session.telegramState === 'authenticated' && config.telegram.isConfigured) {
      try {
        const channelResult = await TdlibService.createPrivateFolderChannel(
          session,
          name.trim(),
          folderId
        );
        telegramChannelId = channelResult.channelId;

        // Record in the user's private Index Channel
        await TdlibService.writeIndexRecord(session, {
          action: 'CREATE_FOLDER',
          folderId,
          name: name.trim(),
          telegramChannelId,
          timestamp: Date.now(),
        }).catch((err) => console.warn('[CloudStorage] Index Channel record write error:', err));
      } catch (err) {
        console.warn('[CloudStorage] Telegram channel creation error:', err);
      }
    }

    const newFolder: CloudFolderRecord = {
      id: folderId,
      name: name.trim(),
      description: description?.trim(),
      color: color || '#5a8bff',
      telegramChannelId,
      createdAt: Date.now(),
      status: 'active',
    };

    // Save to SQLite
    dbService.saveFolder({
      folder_id: folderId,
      user_id: userId,
      name: newFolder.name,
      description: newFolder.description,
      color: newFolder.color,
      telegram_channel_id: telegramChannelId,
      status: 'active',
      created_at: newFolder.createdAt,
    });

    const index = this.getUserIndex(session);
    index.folders.unshift(newFolder);
    this.saveUserIndex(userId, index);

    return newFolder;
  }

  /**
   * Renames a folder (preserves permanent channel ID)
   */
  public static async renameFolder(
    session: UserSession,
    folderId: string,
    newName: string
  ): Promise<CloudFolderRecord> {
    const userId = session.userId || session.sessionId;
    // Verify ownership
    IsolationService.verifyFolderAccess(userId, folderId);

    const index = this.getUserIndex(session);
    const folder = index.folders.find((f) => f.id === folderId && f.status === 'active');

    if (!folder) {
      throw new Error(`Folder with id ${folderId} not found.`);
    }

    folder.name = newName.trim();
    this.saveUserIndex(userId, index);

    // Save to SQLite
    dbService.saveFolder({
      folder_id: folder.id,
      user_id: userId,
      name: folder.name,
      description: folder.description,
      color: folder.color,
      telegram_channel_id: folder.telegramChannelId,
      status: folder.status,
      created_at: folder.createdAt,
    });

    if (session.telegramState === 'authenticated' && config.telegram.isConfigured) {
      await TdlibService.writeIndexRecord(session, {
        action: 'RENAME_FOLDER',
        folderId,
        newName: folder.name,
        telegramChannelId: folder.telegramChannelId,
        timestamp: Date.now(),
      }).catch((err) => console.warn('[CloudStorage] Index write warning:', err));
    }

    return folder;
  }

  /**
   * Deletes a folder
   */
  public static async deleteFolder(session: UserSession, folderId: string): Promise<void> {
    const userId = session.userId || session.sessionId;
    // Verify ownership
    IsolationService.verifyFolderAccess(userId, folderId);

    const index = this.getUserIndex(session);
    const folder = index.folders.find((f) => f.id === folderId);

    if (!folder) {
      throw new Error(`Folder with id ${folderId} not found.`);
    }

    folder.status = 'deleted';
    for (const file of index.files) {
      if (file.folderId === folderId) {
        file.folderId = undefined;
      }
    }

    this.saveUserIndex(userId, index);
    dbService.deleteFolder(userId, folderId);

    if (session.telegramState === 'authenticated' && config.telegram.isConfigured) {
      await TdlibService.writeIndexRecord(session, {
        action: 'DELETE_FOLDER',
        folderId,
        telegramChannelId: folder.telegramChannelId,
        timestamp: Date.now(),
      }).catch((err) => console.warn('[CloudStorage] Index write warning:', err));
    }
  }

  /**
   * Retrieves files (optionally filtered by folder)
   */
  public static getFiles(session: UserSession, folderId?: string): CloudFileRecord[] {
    const index = this.getUserIndex(session);
    if (folderId) {
      return index.files.filter((f) => f.folderId === folderId);
    }
    return index.files;
  }

  /**
   * Finds file by ID
   */
  public static getFileById(session: UserSession, fileId: string): CloudFileRecord | undefined {
    const userId = session.userId || session.sessionId;
    try {
      const file = IsolationService.verifyFileAccess(userId, fileId);
      return {
        id: file.file_id,
        name: file.name,
        size: file.size_bytes,
        mimeType: file.mime_type,
        folderId: file.folder_id,
        telegramChannelId: file.telegram_channel_id,
        telegramMessageId: file.telegram_message_id,
        tag: file.tag,
        starred: Boolean(file.starred),
        createdAt: file.created_at,
        isImage: file.mime_type.startsWith('image/'),
        localPath: file.local_path,
      };
    } catch {
      const index = this.getUserIndex(session);
      return index.files.find((f) => f.id === fileId);
    }
  }

  /**
   * Uploads and stores a file in the target folder's dedicated Telegram channel
   */
  public static async uploadFile(
    session: UserSession,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string,
    tag?: string
  ): Promise<CloudFileRecord> {
    const userId = session.userId || session.sessionId;
    const userRec = IsolationService.resolveUser(session);

    // Verify storage quota
    IsolationService.verifyStorageQuota(userRec, fileBuffer.length);

    if (folderId) {
      IsolationService.verifyFolderAccess(userId, folderId);
    }

    const index = this.getUserIndex(session);
    const { filesDir } = this.getUserStoragePath(userId);

    const fileId = `file_${crypto.randomUUID()}`;
    const isImage = mimeType.startsWith('image/');
    let telegramChannelId: string | undefined;
    let telegramMessageId: number | undefined;

    if (folderId) {
      const folder = index.folders.find((f) => f.id === folderId && f.status === 'active');
      if (folder) {
        telegramChannelId = folder.telegramChannelId;
      }
    }

    // Save local copy in user files directory
    const safeLocalName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localFilePath = path.join(filesDir, safeLocalName);
    fs.writeFileSync(localFilePath, fileBuffer);

    // Upload to Telegram channel via TDLib if authenticated
    if (
      session.telegramState === 'authenticated' &&
      config.telegram.isConfigured &&
      telegramChannelId
    ) {
      try {
        const uploadResult = await TdlibService.uploadFileToFolderChannel(
          session,
          telegramChannelId,
          fileBuffer,
          fileName,
          mimeType,
          `TELZO CLOUD file: ${fileName}`
        );
        telegramMessageId = uploadResult.messageId;

        await TdlibService.writeIndexRecord(session, {
          action: 'UPLOAD_FILE',
          fileId,
          name: fileName,
          size: fileBuffer.length,
          mimeType,
          folderId,
          telegramChannelId,
          telegramMessageId,
          timestamp: Date.now(),
        }).catch((err) => console.warn('[CloudStorage] Index write warning:', err));
      } catch (err) {
        console.warn('[CloudStorage] Telegram upload warning:', err);
      }
    }

    const newRecord: CloudFileRecord = {
      id: fileId,
      name: fileName,
      size: fileBuffer.length,
      mimeType,
      folderId,
      telegramChannelId,
      telegramMessageId,
      tag,
      starred: false,
      createdAt: Date.now(),
      isImage,
      localPath: localFilePath,
    };

    // Save to SQLite & update storage usage
    dbService.saveFile({
      file_id: fileId,
      user_id: userId,
      folder_id: folderId,
      name: fileName,
      size_bytes: fileBuffer.length,
      mime_type: mimeType,
      tag,
      starred: 0,
      telegram_channel_id: telegramChannelId,
      telegram_message_id: telegramMessageId,
      local_path: localFilePath,
      status: 'active',
      created_at: newRecord.createdAt,
    });
    dbService.updateStorageUsage(userId, fileBuffer.length);

    index.files.unshift(newRecord);
    this.saveUserIndex(userId, index);

    return newRecord;
  }

  /**
   * Deletes a file from its folder channel and index
   */
  public static async deleteFile(session: UserSession, fileId: string): Promise<void> {
    const userId = session.userId || session.sessionId;
    // Verify file ownership
    IsolationService.verifyFileAccess(userId, fileId);

    const index = this.getUserIndex(session);
    const file = index.files.find((f) => f.id === fileId);

    if (!file) {
      throw new Error(`File with id ${fileId} not found.`);
    }

    if (
      session.telegramState === 'authenticated' &&
      config.telegram.isConfigured &&
      file.telegramChannelId &&
      file.telegramMessageId
    ) {
      try {
        await TdlibService.deleteMessageFromChannel(
          session,
          file.telegramChannelId,
          file.telegramMessageId
        );
      } catch (err) {
        console.warn('[CloudStorage] Telegram message delete warning:', err);
      }
    }

    if (file.localPath && fs.existsSync(file.localPath)) {
      try {
        fs.unlinkSync(file.localPath);
      } catch (e) {
        console.warn('[CloudStorage] Local file cleanup warning:', e);
      }
    }

    index.files = index.files.filter((f) => f.id !== fileId);
    this.saveUserIndex(userId, index);

    // Delete in SQLite
    dbService.deleteFile(userId, fileId);

    if (session.telegramState === 'authenticated' && config.telegram.isConfigured) {
      await TdlibService.writeIndexRecord(session, {
        action: 'DELETE_FILE',
        fileId,
        name: file.name,
        telegramChannelId: file.telegramChannelId,
        timestamp: Date.now(),
      }).catch((err) => console.warn('[CloudStorage] Index write warning:', err));
    }
  }

  /**
   * Renames a file
   */
  public static async renameFile(
    session: UserSession,
    fileId: string,
    newName: string
  ): Promise<CloudFileRecord> {
    const userId = session.userId || session.sessionId;
    IsolationService.verifyFileAccess(userId, fileId);

    const index = this.getUserIndex(session);
    const file = index.files.find((f) => f.id === fileId);

    if (!file) {
      throw new Error(`File with id ${fileId} not found.`);
    }

    file.name = newName.trim();
    this.saveUserIndex(userId, index);

    dbService.saveFile({
      file_id: file.id,
      user_id: userId,
      folder_id: file.folderId,
      name: file.name,
      size_bytes: file.size,
      mime_type: file.mimeType,
      tag: file.tag,
      starred: file.starred ? 1 : 0,
      telegram_channel_id: file.telegramChannelId,
      telegram_message_id: file.telegramMessageId,
      local_path: file.localPath,
      status: 'active',
      created_at: file.createdAt,
    });

    if (session.telegramState === 'authenticated' && config.telegram.isConfigured) {
      await TdlibService.writeIndexRecord(session, {
        action: 'RENAME_FILE',
        fileId,
        newName: file.name,
        telegramChannelId: file.telegramChannelId,
        timestamp: Date.now(),
      }).catch((err) => console.warn('[CloudStorage] Index write warning:', err));
    }

    return file;
  }
}
