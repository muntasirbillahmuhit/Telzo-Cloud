import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { UserSession, saveSessionsToDisk } from '../middleware/session.js';

// Lazy-loaded tdl and prebuilt-tdlib module references
let tdlModule: any = null;
let prebuiltTdlib: any = null;
let tdlibLoadError: string | null = null;

async function loadTdlibNative(): Promise<{ tdl: any; tdjsonPath: string } | null> {
  if (tdlModule && prebuiltTdlib) {
    const tdjsonPath = config.telegram.tdlibPath || prebuiltTdlib.getTdjson();
    return { tdl: tdlModule, tdjsonPath };
  }

  try {
    tdlModule = await import('tdl');
    prebuiltTdlib = await import('prebuilt-tdlib');
    const tdjsonPath = config.telegram.tdlibPath || prebuiltTdlib.getTdjson();
    console.log(`[TDLib] Native library resolved at: ${tdjsonPath}`);
    return { tdl: tdlModule, tdjsonPath };
  } catch (err: unknown) {
    tdlibLoadError = err instanceof Error ? err.message : String(err);
    console.warn('[TDLib] Could not load native TDLib binaries:', tdlibLoadError);
    return null;
  }
}

// Active user TDLib client instances keyed by userId (or sessionId)
const activeClients = new Map<string, any>();
const clientAuthStates = new Map<string, string>();

export class TdlibService {
  /**
   * Diagnostic status of TDLib engine and configuration
   */
  public static async getEngineStatus() {
    const native = await loadTdlibNative();
    return {
      nativeAvailable: Boolean(native),
      nativePath: native?.tdjsonPath || null,
      nativeError: tdlibLoadError,
      credentialsConfigured: config.telegram.isConfigured,
      apiIdPresent: Boolean(config.telegram.apiId),
      apiHashPresent: Boolean(config.telegram.apiHash),
      tdlibDataDir: config.telegram.tdlibDataDir,
      activeClientCount: activeClients.size,
    };
  }

  /**
   * Derives isolated persistent storage directories for an account
   */
  private static getUserPaths(userId: string) {
    const userDir = path.join(config.telegram.tdlibDataDir, `user_${userId}`);
    const dbDir = path.join(userDir, 'db');
    const filesDir = path.join(userDir, 'files');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    return { userDir, dbDir, filesDir };
  }

  /**
   * Derives a database encryption key for an account
   */
  private static getDatabaseEncryptionKey(userId: string): string {
    return crypto
      .createHmac('sha256', config.sessionEncryptionKey)
      .update(`tdlib_db_enc_${userId}`)
      .digest('hex');
  }

  /**
   * Gets or initializes an isolated TDLib client for the user session
   */
  public static async getOrCreateClient(session: UserSession): Promise<any> {
    const identifier = session.userId || session.sessionId;

    if (activeClients.has(identifier)) {
      return activeClients.get(identifier);
    }

    const native = await loadTdlibNative();
    if (!native) {
      throw new Error(
        `TDLib native library is not available in this environment. ${tdlibLoadError || ''}`
      );
    }

    if (!config.telegram.isConfigured) {
      throw new Error(
        'TELEGRAM_API_ID and TELEGRAM_API_HASH are not configured. Obtain credentials at https://my.telegram.org and add them to .env.'
      );
    }

    const { dbDir, filesDir } = this.getUserPaths(identifier);
    const dbKey = this.getDatabaseEncryptionKey(identifier);

    const client = native.tdl.createClient({
      apiId: config.telegram.apiId!,
      apiHash: config.telegram.apiHash!,
      tdlibInstance: native.tdjsonPath,
      databaseDirectory: dbDir,
      filesDirectory: filesDir,
      databaseEncryptionKey: dbKey,
      useTestDc: false,
    });

    // Listen to updates for authorization states
    client.on('update', (update: any) => {
      if (update._ === 'updateAuthorizationState') {
        const stateName = update.authorization_state?._;
        console.log(`[TDLib:${identifier}] Auth state changed -> ${stateName}`);
        clientAuthStates.set(identifier, stateName);

        if (stateName === 'authorizationStateWaitPhoneNumber') {
          session.telegramState = 'awaiting_phone';
        } else if (stateName === 'authorizationStateWaitCode') {
          session.telegramState = 'awaiting_code';
        } else if (stateName === 'authorizationStateWaitPassword') {
          session.telegramState = 'awaiting_password';
        } else if (stateName === 'authorizationStateReady') {
          session.telegramState = 'authenticated';
        }
        saveSessionsToDisk();
      }
    });

    client.on('error', (err: any) => {
      console.error(`[TDLib:${identifier}] Client error:`, err);
    });

    activeClients.set(identifier, client);
    return client;
  }

  /**
   * Initiates TDLib authorization using user's phone number
   */
  public static async startPhoneAuth(session: UserSession, phoneNumber: string) {
    const cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{7,14}$/.test(cleanedPhone)) {
      throw new Error(
        'Invalid phone number format. Please provide an international phone number (e.g., +1234567890).'
      );
    }

    const client = await this.getOrCreateClient(session);

    console.log(`[TDLib] Sending setAuthenticationPhoneNumber for user ${session.sessionId}`);
    await client.invoke({
      _: 'setAuthenticationPhoneNumber',
      phone_number: cleanedPhone,
    });

    session.phone = cleanedPhone;
    session.telegramState = 'awaiting_code';
    saveSessionsToDisk();

    return {
      success: true,
      state: 'awaiting_code',
      message: 'Verification code sent to your Telegram account or via SMS.',
    };
  }

  /**
   * Verifies the Telegram security code
   */
  public static async verifyCode(session: UserSession, code: string) {
    if (!code || code.trim().length < 4) {
      throw new Error('Verification code must be at least 4 digits.');
    }

    const client = await this.getOrCreateClient(session);

    console.log(`[TDLib] Submitting checkAuthenticationCode`);
    await client.invoke({
      _: 'checkAuthenticationCode',
      code: code.trim(),
    });

    // Check if client transitioned to ready or needs password
    const identifier = session.userId || session.sessionId;
    const currentState = clientAuthStates.get(identifier);

    if (currentState === 'authorizationStateWaitPassword') {
      session.telegramState = 'awaiting_password';
      saveSessionsToDisk();
      return {
        success: true,
        state: 'awaiting_password',
        message: 'Two-step verification password is required for this account.',
      };
    }

    // Attempt to finalize account linking
    return await this.finalizeAuthentication(session, client);
  }

  /**
   * Verifies the 2FA Cloud Password
   */
  public static async verifyPassword(session: UserSession, password: string) {
    if (!password) {
      throw new Error('Two-step verification password cannot be empty.');
    }

    const client = await this.getOrCreateClient(session);

    await client.invoke({
      _: 'checkAuthenticationPassword',
      password,
    });

    return await this.finalizeAuthentication(session, client);
  }

  /**
   * Verifies OIDC and TDLib match, and populates session with Telegram user profile
   */
  private static async finalizeAuthentication(session: UserSession, client: any) {
    const me = await client.invoke({ _: 'getMe' });
    const tdlibUserId = String(me.id);

    // If user already authenticated via OIDC, verify identity ownership!
    if (session.oidcUser) {
      if (session.oidcUser.telegramId !== tdlibUserId) {
        // Disconnect mismatched client
        await client.invoke({ _: 'logOut' }).catch(() => {});
        throw new Error(
          `Account mismatch! The Telegram OIDC identity (${session.oidcUser.telegramId}) does not match the authorized TDLib account (${tdlibUserId}). Login aborted.`
        );
      }
    }

    const username = me.usernames?.active_usernames?.[0] || me.username || undefined;
    const firstName = me.first_name || '';
    const lastName = me.last_name || undefined;

    session.user = {
      id: me.id,
      username,
      firstName,
      lastName,
    };
    session.telegramState = 'authenticated';
    saveSessionsToDisk();

    console.log(`[TDLib] User successfully authenticated: ${me.id} (@${username || 'no_handle'})`);

    return {
      success: true,
      state: 'authenticated',
      user: session.user,
      message: 'Successfully authorized with Telegram TDLib.',
    };
  }

  /**
   * Creates a dedicated private Telegram channel for a user folder
   */
  public static async createPrivateFolderChannel(
    session: UserSession,
    folderName: string,
    folderId: string
  ): Promise<{ channelId: string; title: string }> {
    const client = await this.getOrCreateClient(session);

    console.log(`[TDLib] Creating private channel for folder "${folderName}" (${folderId})`);
    const result = await client.invoke({
      _: 'createNewSupergroupChat',
      title: folderName,
      is_channel: true,
      description: `TELZO CLOUD folder - ${folderId}`,
    });

    const channelId = String(result.id);
    return {
      channelId,
      title: result.title || folderName,
    };
  }

  /**
   * Finds or creates the private Index Channel for storing user cloud metadata
   */
  public static async getOrCreateIndexChannel(session: UserSession): Promise<string> {
    if (session.indexChannelId) {
      return session.indexChannelId;
    }

    const client = await this.getOrCreateClient(session);

    // Check recent chats to see if TELZO_CLOUD_INDEX exists
    try {
      const chats = await client.invoke({
        _: 'getChats',
        chat_list: { _: 'chatListMain' },
        limit: 100,
      });

      for (const chatId of chats.chat_ids) {
        const chat = await client.invoke({ _: 'getChat', chat_id: chatId });
        if (chat.title === 'TELZO_CLOUD_INDEX' || chat.title === 'TELZO Cloud Index') {
          session.indexChannelId = String(chat.id);
          saveSessionsToDisk();
          return session.indexChannelId;
        }
      }
    } catch (e) {
      console.warn('[TDLib] Index channel discovery scan warning:', e);
    }

    // Create new private Index Channel
    console.log('[TDLib] Creating private TELZO_CLOUD_INDEX channel for user...');
    const created = await client.invoke({
      _: 'createNewSupergroupChat',
      title: 'TELZO_CLOUD_INDEX',
      is_channel: true,
      description: 'TELZO CLOUD Dedicated Private Metadata Index Channel. Do not delete.',
    });

    session.indexChannelId = String(created.id);
    saveSessionsToDisk();
    return session.indexChannelId;
  }

  /**
   * Appends an encrypted metadata message to the Index Channel
   */
  public static async writeIndexRecord(
    session: UserSession,
    record: Record<string, any>
  ): Promise<number> {
    const client = await this.getOrCreateClient(session);
    const indexChannelId = await this.getOrCreateIndexChannel(session);

    const textPayload = `[TELZO_META_V1]\n${JSON.stringify(record, null, 2)}`;

    const message = await client.invoke({
      _: 'sendMessage',
      chat_id: Number(indexChannelId),
      input_message_content: {
        _: 'inputMessageText',
        text: {
          _: 'formattedText',
          text: textPayload,
        },
      },
    });

    return message.id;
  }

  /**
   * Uploads a file directly to the dedicated private folder channel
   */
  public static async uploadFileToFolderChannel(
    session: UserSession,
    channelId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    caption?: string
  ): Promise<{ messageId: number; fileId: number; size: number }> {
    const client = await this.getOrCreateClient(session);

    // Write file temporarily to isolated user upload directory
    const tempDir = path.join(config.telegram.telzoDataDir, 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `${Date.now()}_${fileName}`);
    fs.writeFileSync(tempFilePath, fileBuffer);

    try {
      const isImage = mimeType.startsWith('image/');
      let inputContent: any;

      if (isImage) {
        inputContent = {
          _: 'inputMessagePhoto',
          photo: {
            _: 'inputFileLocal',
            path: tempFilePath,
          },
          caption: caption
            ? {
                _: 'formattedText',
                text: caption,
              }
            : undefined,
        };
      } else {
        inputContent = {
          _: 'inputMessageDocument',
          document: {
            _: 'inputFileLocal',
            path: tempFilePath,
          },
          caption: caption
            ? {
                _: 'formattedText',
                text: caption,
              }
            : undefined,
        };
      }

      const message = await client.invoke({
        _: 'sendMessage',
        chat_id: Number(channelId),
        input_message_content: inputContent,
      });

      return {
        messageId: message.id,
        fileId: message.content?.document?.document?.id || message.content?.photo?.sizes?.[0]?.photo?.id || message.id,
        size: fileBuffer.length,
      };
    } finally {
      // Clean up temporary local upload file safely
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        console.warn('[TDLib] Temporary upload cleanup warning:', e);
      }
    }
  }

  /**
   * Deletes a file message from a folder channel
   */
  public static async deleteMessageFromChannel(
    session: UserSession,
    channelId: string,
    messageId: number
  ) {
    const client = await this.getOrCreateClient(session);
    await client.invoke({
      _: 'deleteMessages',
      chat_id: Number(channelId),
      message_ids: [messageId],
      revoke: true,
    });
  }

  /**
   * Logs out TDLib session and revokes client
   */
  public static async logOut(session: UserSession) {
    const identifier = session.userId || session.sessionId;
    if (activeClients.has(identifier)) {
      const client = activeClients.get(identifier);
      try {
        await client.invoke({ _: 'logOut' });
      } catch (e) {
        console.warn(`[TDLib:${identifier}] Log out error:`, e);
      }
      activeClients.delete(identifier);
      clientAuthStates.delete(identifier);
    }
  }
}
