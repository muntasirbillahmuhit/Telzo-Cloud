import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export type TelegramSessionState = 'unconfigured' | 'ready_for_tdlib' | 'awaiting_code' | 'authenticated';

export interface UserSession {
  sessionId: string;
  createdAt: number;
  lastActive: number;
  telegramState: TelegramSessionState;
  phone?: string;
  phoneCodeHash?: string;
  user?: {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
  };
}

// In-memory store for active sessions (prepared to hold TDLib client instances)
export const activeSessions = new Map<string, UserSession>();

export interface AuthenticatedRequest extends Request {
  session?: UserSession;
}

export const sessionMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const headerToken = req.headers['x-session-id'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  const sessionId = Array.isArray(headerToken) ? headerToken[0] : headerToken;

  if (sessionId && activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId)!;
    session.lastActive = Date.now();
    req.session = session;
  }

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
        message: 'Valid session required. Please provide a valid x-session-id header.',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }
  next();
};

export const createSession = (): UserSession => {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const session: UserSession = {
    sessionId,
    createdAt: Date.now(),
    lastActive: Date.now(),
    telegramState: 'unconfigured',
  };
  activeSessions.set(sessionId, session);
  return session;
};
