import { Router, Response } from 'express';
import { AuthenticatedRequest, createSession, saveSessionsToDisk } from '../middleware/session.js';
import { TdlibService } from '../services/tdlib.service.js';

const router = Router();

/**
 * GET /api/telegram/status
 * Returns current TDLib backend readiness, native library presence, and session state.
 */
router.get('/telegram/status', async (req: AuthenticatedRequest, res: Response) => {
  const engineStatus = await TdlibService.getEngineStatus();

  res.status(200).json({
    success: true,
    data: {
      ...engineStatus,
      session: req.session
        ? {
            sessionId: req.session.sessionId,
            telegramState: req.session.telegramState,
            phone: req.session.phone,
            user: req.session.user || null,
            oidcUser: req.session.oidcUser || null,
            indexChannelId: req.session.indexChannelId || null,
          }
        : null,
    },
  });
});

/**
 * POST /api/telegram/authorize
 * Body: { phone: string }
 * Initiates TDLib account authorization via phone number.
 */
router.post('/telegram/authorize', async (req: AuthenticatedRequest, res: Response) => {
  const { phone } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Phone number is required and must be an international phone number (e.g. +1234567890).',
        code: 'INVALID_PHONE',
      },
    });
    return;
  }

  const session = req.session || createSession();
  if (res.locals.setSessionCookie) {
    res.locals.setSessionCookie(session.sessionId);
  }

  try {
    const result = await TdlibService.startPhoneAuth(session, phone);
    res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({
      success: false,
      sessionId: session.sessionId,
      error: {
        message: msg,
        code: 'TDLIB_AUTH_ERROR',
      },
    });
  }
});

/**
 * POST /api/telegram/verify-code
 * Body: { code: string }
 * Submits the Telegram verification code received via Telegram message or SMS.
 */
router.post('/telegram/verify-code', async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body || {};

  if (!req.session) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Session required. Please start authorization by providing your phone number first.',
        code: 'NO_SESSION',
      },
    });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Verification code is required.',
        code: 'INVALID_CODE',
      },
    });
    return;
  }

  try {
    const result = await TdlibService.verifyCode(req.session, code);
    res.status(200).json({
      success: true,
      sessionId: req.session.sessionId,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({
      success: false,
      error: {
        message: msg,
        code: 'VERIFICATION_ERROR',
      },
    });
  }
});

/**
 * POST /api/telegram/verify-password
 * Body: { password: string }
 * Submits 2-Step Verification password if required.
 */
router.post('/telegram/verify-password', async (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body || {};

  if (!req.session) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Session required.',
        code: 'NO_SESSION',
      },
    });
    return;
  }

  if (!password || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Two-step verification password is required.',
        code: 'INVALID_PASSWORD',
      },
    });
    return;
  }

  try {
    const result = await TdlibService.verifyPassword(req.session, password);
    res.status(200).json({
      success: true,
      sessionId: req.session.sessionId,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({
      success: false,
      error: {
        message: msg,
        code: 'PASSWORD_VERIFICATION_ERROR',
      },
    });
  }
});

/**
 * POST /api/telegram/session (Compatibility endpoint)
 * Body: { username: string, displayName?: string }
 */
router.post('/telegram/session', (req: AuthenticatedRequest, res: Response) => {
  const { username, displayName } = req.body || {};

  if (!username || typeof username !== 'string' || !username.trim()) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Username is required to establish Telegram session.',
        code: 'MISSING_USERNAME',
      },
    });
    return;
  }

  const session = req.session || createSession();
  if (res.locals.setSessionCookie) {
    res.locals.setSessionCookie(session.sessionId);
  }

  const cleanUsername = username.replace(/^https?:\/\/t\.me\//, '').replace(/^@+/, '').trim();

  session.user = {
    id: session.user?.id || Math.floor(100000000 + Math.random() * 900000000),
    username: cleanUsername,
    firstName: (typeof displayName === 'string' && displayName.trim()) ? displayName.trim() : cleanUsername,
  };
  session.telegramState = 'authenticated';
  session.lastActive = Date.now();
  saveSessionsToDisk();

  res.status(200).json({
    success: true,
    sessionId: session.sessionId,
    state: session.telegramState,
    user: session.user,
  });
});

/**
 * POST /api/telegram/logout
 */
router.post('/telegram/logout', async (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    await TdlibService.logOut(req.session).catch(() => {});
    req.session.telegramState = 'unconfigured';
    req.session.user = undefined;
    req.session.phone = undefined;
    req.session.lastActive = Date.now();
    saveSessionsToDisk();
  }

  res.status(200).json({
    success: true,
    message: 'Signed out of Telegram session.',
  });
});

export default router;
