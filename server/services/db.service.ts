import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export interface UserRecord {
  id: string;
  oidc_sub?: string;
  telegram_user_id?: string;
  username?: string;
  display_name?: string;
  phone?: string;
  account_status: 'active' | 'suspended' | 'deleted';
  storage_quota_bytes: number;
  used_storage_bytes: number;
  index_channel_id?: string;
  storage_initialized: number;
  created_at: number;
  last_active_at: number;
}

export interface SessionRecord {
  session_id: string;
  user_id: string;
  telegram_auth_state: string;
  oidc_state?: string;
  code_verifier?: string;
  nonce?: string;
  created_at: number;
  expires_at: number;
  last_active: number;
  ip_address?: string;
  user_agent?: string;
}

export interface FolderRecord {
  folder_id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  telegram_channel_id?: string;
  status: 'active' | 'deleted';
  created_at: number;
}

export interface FileRecord {
  file_id: string;
  user_id: string;
  folder_id?: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  tag?: string;
  starred: number;
  telegram_channel_id?: string;
  telegram_message_id?: number;
  local_path?: string;
  status: 'active' | 'deleted';
  created_at: number;
}

class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dataDir = config.telegram.telzoDataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'telzo_platform.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        oidc_sub TEXT UNIQUE,
        telegram_user_id TEXT UNIQUE,
        username TEXT,
        display_name TEXT,
        phone TEXT,
        account_status TEXT DEFAULT 'active',
        storage_quota_bytes INTEGER DEFAULT 5368709120,
        used_storage_bytes INTEGER DEFAULT 0,
        index_channel_id TEXT,
        storage_initialized INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        telegram_auth_state TEXT DEFAULT 'unconfigured',
        oidc_state TEXT,
        code_verifier TEXT,
        nonce TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_folders (
        folder_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        telegram_channel_id TEXT,
        status TEXT DEFAULT 'active',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_files (
        file_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT,
        name TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        tag TEXT,
        starred INTEGER DEFAULT 0,
        telegram_channel_id TEXT,
        telegram_message_id INTEGER,
        local_path TEXT,
        status TEXT DEFAULT 'active',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES user_folders(folder_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_folders_user_id ON user_folders(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON user_files(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_folder_id ON user_files(folder_id);
    `);
  }

  // ================= User Operations =================

  public findUserById(userId: string): UserRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId) as UserRecord | undefined;
  }

  public findUserByOidcSub(sub: string): UserRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE oidc_sub = ?');
    return stmt.get(sub) as UserRecord | undefined;
  }

  public findUserByTelegramId(telegramId: string): UserRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE telegram_user_id = ?');
    return stmt.get(telegramId) as UserRecord | undefined;
  }

  public createUser(user: Partial<UserRecord> & { id: string }): UserRecord {
    const now = Date.now();
    const newUser: UserRecord = {
      id: user.id,
      oidc_sub: user.oidc_sub,
      telegram_user_id: user.telegram_user_id,
      username: user.username,
      display_name: user.display_name || user.username || 'Telegram User',
      phone: user.phone,
      account_status: user.account_status || 'active',
      storage_quota_bytes: user.storage_quota_bytes || 5 * 1024 * 1024 * 1024, // 5 GB
      used_storage_bytes: user.used_storage_bytes || 0,
      index_channel_id: user.index_channel_id,
      storage_initialized: user.storage_initialized || 0,
      created_at: user.created_at || now,
      last_active_at: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, oidc_sub, telegram_user_id, username, display_name, phone,
        account_status, storage_quota_bytes, used_storage_bytes,
        index_channel_id, storage_initialized, created_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newUser.id,
      newUser.oidc_sub || null,
      newUser.telegram_user_id || null,
      newUser.username || null,
      newUser.display_name,
      newUser.phone || null,
      newUser.account_status,
      newUser.storage_quota_bytes,
      newUser.used_storage_bytes,
      newUser.index_channel_id || null,
      newUser.storage_initialized,
      newUser.created_at,
      newUser.last_active_at
    );

    return newUser;
  }

  public updateUser(userId: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findUserById(userId);

    fields.push('last_active_at = ?');
    values.push(Date.now());
    values.push(userId);

    const stmt = this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findUserById(userId);
  }

  public updateStorageUsage(userId: string, addedBytes: number) {
    const stmt = this.db.prepare(
      'UPDATE users SET used_storage_bytes = MAX(0, used_storage_bytes + ?) WHERE id = ?'
    );
    stmt.run(addedBytes, userId);
  }

  // ================= Session Operations =================

  public getSession(sessionId: string): SessionRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE session_id = ?');
    return stmt.get(sessionId) as SessionRecord | undefined;
  }

  public saveSession(session: SessionRecord) {
    if (session.user_id && !this.findUserById(session.user_id)) {
      this.createUser({
        id: session.user_id,
        display_name: 'Guest User',
      });
    }

    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        session_id, user_id, telegram_auth_state, oidc_state, code_verifier, nonce,
        created_at, expires_at, last_active, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        user_id = excluded.user_id,
        telegram_auth_state = excluded.telegram_auth_state,
        oidc_state = excluded.oidc_state,
        code_verifier = excluded.code_verifier,
        nonce = excluded.nonce,
        expires_at = excluded.expires_at,
        last_active = excluded.last_active,
        ip_address = excluded.ip_address,
        user_agent = excluded.user_agent
    `);

    stmt.run(
      session.session_id,
      session.user_id,
      session.telegram_auth_state,
      session.oidc_state || null,
      session.code_verifier || null,
      session.nonce || null,
      session.created_at,
      session.expires_at,
      session.last_active,
      session.ip_address || null,
      session.user_agent || null
    );
  }

  public deleteSession(sessionId: string) {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE session_id = ?');
    stmt.run(sessionId);
  }

  // ================= Folder Operations =================

  public getFoldersForUser(userId: string): FolderRecord[] {
    const stmt = this.db.prepare('SELECT * FROM user_folders WHERE user_id = ? AND status = ? ORDER BY created_at DESC');
    return stmt.all(userId, 'active') as FolderRecord[];
  }

  public getFolderById(userId: string, folderId: string): FolderRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM user_folders WHERE user_id = ? AND folder_id = ? AND status = ?');
    return stmt.get(userId, folderId, 'active') as FolderRecord | undefined;
  }

  public saveFolder(folder: FolderRecord) {
    const stmt = this.db.prepare(`
      INSERT INTO user_folders (folder_id, user_id, name, description, color, telegram_channel_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(folder_id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        color = excluded.color,
        telegram_channel_id = excluded.telegram_channel_id,
        status = excluded.status
    `);

    stmt.run(
      folder.folder_id,
      folder.user_id,
      folder.name,
      folder.description || null,
      folder.color || null,
      folder.telegram_channel_id || null,
      folder.status || 'active',
      folder.created_at
    );
  }

  public deleteFolder(userId: string, folderId: string) {
    const stmt = this.db.prepare('UPDATE user_folders SET status = ? WHERE user_id = ? AND folder_id = ?');
    stmt.run('deleted', userId, folderId);
  }

  // ================= File Operations =================

  public getFilesForUser(userId: string, folderId?: string): FileRecord[] {
    if (folderId) {
      const stmt = this.db.prepare(
        'SELECT * FROM user_files WHERE user_id = ? AND folder_id = ? AND status = ? ORDER BY created_at DESC'
      );
      return stmt.all(userId, folderId, 'active') as FileRecord[];
    }
    const stmt = this.db.prepare('SELECT * FROM user_files WHERE user_id = ? AND status = ? ORDER BY created_at DESC');
    return stmt.all(userId, 'active') as FileRecord[];
  }

  public getFileById(userId: string, fileId: string): FileRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM user_files WHERE user_id = ? AND file_id = ? AND status = ?');
    return stmt.get(userId, fileId, 'active') as FileRecord | undefined;
  }

  public saveFile(file: FileRecord) {
    const stmt = this.db.prepare(`
      INSERT INTO user_files (
        file_id, user_id, folder_id, name, size_bytes, mime_type, tag,
        starred, telegram_channel_id, telegram_message_id, local_path, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(file_id) DO UPDATE SET
        name = excluded.name,
        tag = excluded.tag,
        starred = excluded.starred,
        telegram_channel_id = excluded.telegram_channel_id,
        telegram_message_id = excluded.telegram_message_id,
        local_path = excluded.local_path,
        status = excluded.status
    `);

    stmt.run(
      file.file_id,
      file.user_id,
      file.folder_id || null,
      file.name,
      file.size_bytes,
      file.mime_type,
      file.tag || null,
      file.starred ? 1 : 0,
      file.telegram_channel_id || null,
      file.telegram_message_id || null,
      file.local_path || null,
      file.status || 'active',
      file.created_at
    );
  }

  public deleteFile(userId: string, fileId: string): FileRecord | undefined {
    const file = this.getFileById(userId, fileId);
    if (!file) return undefined;

    const stmt = this.db.prepare('UPDATE user_files SET status = ? WHERE user_id = ? AND file_id = ?');
    stmt.run('deleted', userId, fileId);

    // Subtract storage usage
    this.updateStorageUsage(userId, -file.size_bytes);
    return file;
  }

  public deleteUserAccount(userId: string) {
    const deleteFiles = this.db.prepare('DELETE FROM user_files WHERE user_id = ?');
    const deleteFolders = this.db.prepare('DELETE FROM user_folders WHERE user_id = ?');
    const deleteSessions = this.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    const deleteUser = this.db.prepare('DELETE FROM users WHERE id = ?');

    const transaction = this.db.transaction(() => {
      deleteFiles.run(userId);
      deleteFolders.run(userId);
      deleteSessions.run(userId);
      deleteUser.run(userId);
    });

    transaction();
  }
}

export const dbService = new DatabaseService();
