import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { dbService, UserRecord } from '../services/db.service.js';

export type TelegramSessionState =
  | 'unconfigured'
  | 'ready_for_tdlib'
  | 'awaiting_phone'
  | 'awaiting_code'
  | 'awaiting_password'
  | 'authenticated';

export interface OidcIdentity {
  telegramId: string;
  username?: string;
  displayName?: string;
  photoUrl?: string;
  verifiedAt: number;
}

export interface UserSession {
  sessionId: string;
  userId: string; // SQLite user UUID
  createdAt: number;
  lastActive: number;
  telegramState: TelegramSessionState;
  phone?: string;
  phoneCodeHash?: string;
  oidcState?: {
    state: string;
    nonce: string;
    codeVerifier: string;
    createdAt: number;
  };
  oidcUser?: OidcIdentity;
  user?: {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
  };
  indexChannelId?: string;
}

// In-memory active session cache
export const activeSessions = new Map<string, UserSession>();

const sessionsFilePath = path.join(config.telegram.telzoDataDir, 'sessions.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(config.telegram.telzoDataDir)) {
      fs.mkdirSync(config.telegram.telzoDataDir, { recursive: true });
    }
  } catch (err) {
    console.error('[SessionStore] Error creating data directory:', err);
  }
}

export function saveSessionsToDisk() {
  try {
    ensureDataDir();
    const data: Record<string, UserSession> = {};
    for (const [id, sess] of activeSessions.entries()) {
      data[id] = sess;
      // Also persist to SQLite
      dbService.saveSession({
        session_id: sess.sessionId,
        user_id: sess.userId,
        telegram_auth_state: sess.telegramState,
        oidc_state: sess.oidcState?.state,
        code_verifier: sess.oidcState?.codeVerifier,
        nonce: sess.oidcState?.nonce,
        created_at: sess.createdAt,
        expires_at: sess.createdAt + 30 * 24 * 60 * 60 * 1000,
        last_active: sess.lastActive,
      });
    }
    const tempPath = `${sessionsFilePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, sessionsFilePath);
  } catch (err) {
    console.warn('[SessionStore] Could not persist sessions to disk:', err);
  }
}

export function loadSessionsFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(sessionsFilePath)) {
      const raw = fs.readFileSync(sessionsFilePath, 'utf8');
      const data: Record<string, UserSession> = JSON.parse(raw);
      for (const [id, sess] of Object.entries(data)) {
        if (!sess.userId) {
          sess.userId = `user_${crypto.createHash('sha256').update(id).digest('hex').substring(0, 16)}`;
        }
        if (!dbService.findUserById(sess.userId)) {
          dbService.createUser({
            id: sess.userId,
            telegram_user_id: sess.user?.id ? String(sess.user.id) : sess.oidcUser?.telegramId,
            username: sess.user?.username || sess.oidcUser?.username,
            display_name: sess.user ? `${sess.user.firstName}${sess.user.lastName ? ' ' + sess.user.lastName : ''}` : sess.oidcUser?.displayName || 'Restored User',
            phone: sess.phone,
          });
        }
        activeSessions.set(id, sess);
      }
      console.log(`[SessionStore] Restored ${activeSessions.size} session(s) from persistent storage.`);
    }
  } catch (err) {
    console.warn('[SessionStore] Could not load sessions from disk:', err);
  }
}

loadSessionsFromDisk();

export interface AuthenticatedRequest extends Request {
  session?: UserSession;
  sessionId?: string;
  userRecord?: UserRecord;
}

export const sessionMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const cookieSessionId = req.cookies?.telzo_sid;
  const headerToken = req.headers['x-session-id'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  const rawSessionId = cookieSessionId || (Array.isArray(headerToken) ? headerToken[0] : headerToken);

  if (rawSessionId && typeof rawSessionId === 'string' && rawSessionId.trim()) {
    const sessionId = rawSessionId.trim();
    let session = activeSessions.get(sessionId);
    if (!session) {
      session = createSession(sessionId);
    }
    session.lastActive = Date.now();
    req.session = session;
    req.sessionId = session.sessionId;

    if (session.userId) {
      req.userRecord = dbService.findUserById(session.userId);
    }
  } else {
    const newSession = createSession();
    req.session = newSession;
    req.sessionId = newSession.sessionId;
    req.userRecord = dbService.findUserById(newSession.userId);

    res.cookie('telzo_sid', newSession.sessionId, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.locals.setSessionCookie = (sid: string) => {
    res.cookie('telzo_sid', sid, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  };

  next();
};

export const requireSession = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.session) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Valid session required. Please provide a valid x-session-id or cookie.',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }
  next();
};

export const requireAuthenticatedTelegram = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.session || req.session.telegramState !== 'authenticated') {
    res.status(403).json({
      success: false,
      error: {
        message: 'Authenticated Telegram account is required for this operation.',
        code: 'TELEGRAM_AUTH_REQUIRED',
      },
    });
    return;
  }
  next();
};

export const createSession = (customSessionId?: string): UserSession => {
  const sessionId = customSessionId || crypto.randomBytes(32).toString('hex');
  const userId = `user_${crypto.createHash('sha256').update(sessionId).digest('hex').substring(0, 16)}`;

  // Ensure user record exists in SQLite
  let userRecord = dbService.findUserById(userId);
  if (!userRecord) {
    userRecord = dbService.createUser({
      id: userId,
      display_name: 'Guest User',
    });
  }

  const session: UserSession = {
    sessionId,
    userId,
    createdAt: Date.now(),
    lastActive: Date.now(),
    telegramState: 'unconfigured',
  };

  activeSessions.set(sessionId, session);
  saveSessionsToDisk();
  return session;
};

export const deleteSession = (sessionId: string) => {
  activeSessions.delete(sessionId);
  dbService.deleteSession(sessionId);
  saveSessionsToDisk();
};
