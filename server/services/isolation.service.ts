import { dbService, UserRecord, FolderRecord, FileRecord } from './db.service.js';
import { UserSession } from '../middleware/session.js';

export class IsolationService {
  /**
   * Resolves the verified internal UserRecord from the authenticated server-side session.
   * Throws an error if session is invalid or user does not exist.
   */
  public static resolveUser(session: UserSession): UserRecord {
    if (!session || !session.userId) {
      throw new Error('UNAUTHORIZED: No valid session or user ID found.');
    }

    const user = dbService.findUserById(session.userId);
    if (!user) {
      throw new Error(`UNAUTHORIZED: User account ${session.userId} does not exist.`);
    }

    if (user.account_status === 'suspended') {
      throw new Error('FORBIDDEN: Account is suspended.');
    }

    if (user.account_status === 'deleted') {
      throw new Error('UNAUTHORIZED: Account has been deleted.');
    }

    return user;
  }

  /**
   * Verifies that the requested folder belongs strictly to the authenticated user.
   * Prevents cross-account folder access (IDOR protection).
   */
  public static verifyFolderAccess(userId: string, folderId: string): FolderRecord {
    const folder = dbService.getFolderById(userId, folderId);
    if (!folder) {
      throw new Error(`FORBIDDEN: Folder ${folderId} does not belong to user ${userId} or does not exist.`);
    }
    return folder;
  }

  /**
   * Verifies that the requested file belongs strictly to the authenticated user.
   * Prevents cross-account file access (IDOR protection).
   */
  public static verifyFileAccess(userId: string, fileId: string): FileRecord {
    const file = dbService.getFileById(userId, fileId);
    if (!file) {
      throw new Error(`FORBIDDEN: File ${fileId} does not belong to user ${userId} or does not exist.`);
    }
    return file;
  }

  /**
   * Checks if user has enough storage quota left for an upload.
   */
  public static verifyStorageQuota(user: UserRecord, uploadSizeBytes: number) {
    const projectedUsage = user.used_storage_bytes + uploadSizeBytes;
    if (projectedUsage > user.storage_quota_bytes) {
      const quotaMb = (user.storage_quota_bytes / (1024 * 1024)).toFixed(0);
      const usedMb = (user.used_storage_bytes / (1024 * 1024)).toFixed(2);
      throw new Error(
        `QUOTA_EXCEEDED: Upload size ${(uploadSizeBytes / (1024 * 1024)).toFixed(
          2
        )} MB exceeds available storage limit. (Used: ${usedMb} MB / ${quotaMb} MB)`
      );
    }
  }
}
