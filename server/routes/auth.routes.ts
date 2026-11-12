import { Router, Request, Response } from 'express';
import {
  AuthenticatedRequest,
  createSession,
  deleteSession,
  saveSessionsToDisk,
} from '../middleware/session.js';
import { OidcService } from '../services/oidc.service.js';
import { TdlibService } from '../services/tdlib.service.js';
import { dbService } from '../services/db.service.js';

const router = Router();

/**
 * GET /api/auth/telegram/status
 * Returns current OIDC identity, TDLib authorization state, SQLite user record, and backend readiness.
 */
router.get('/auth/telegram/status', async (req: AuthenticatedRequest, res: Response) => {
  const oidcStatus = OidcService.getStatus();
  const tdlibEngine = await TdlibService.getEngineStatus();

  const userRecord = req.session?.userId
    ? dbService.findUserById(req.session.userId)
    : undefined;

  res.status(200).json({
    success: true,
    data: {
      oidc: oidcStatus,
      tdlib: tdlibEngine,
      user: userRecord || null,
      session: req.session
        ? {
            sessionId: req.session.sessionId,
            userId: req.session.userId,
            telegramState: req.session.telegramState,
            oidcUser: req.session.oidcUser || null,
            user: req.session.user || null,
            phone: req.session.phone || null,
            indexChannelId: req.session.indexChannelId || null,
          }
        : null,
    },
  });
});

/**
 * GET /api/auth/status
 * Alias for authentication status
 */
router.get('/auth/status', async (req: AuthenticatedRequest, res: Response) => {
  const userRecord = req.session?.userId
    ? dbService.findUserById(req.session.userId)
    : undefined;

  res.status(200).json({
    success: true,
    data: {
      user: userRecord || null,
      session: req.session || null,
    },
  });
});

/**
 * GET /api/auth/telegram
 * Starts Telegram OpenID Connect Authorization Code Flow with PKCE (S256).
 */
router.get('/auth/telegram', (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = req.session || createSession();
    if (res.locals.setSessionCookie) {
      res.locals.setSessionCookie(session.sessionId);
    }

    const { url, state } = OidcService.createAuthorizationRequest(session);

    if (req.headers.accept?.includes('application/json')) {
      res.status(200).json({
        success: true,
        authUrl: url,
        state,
        sessionId: session.sessionId,
      });
      return;
    }

    res.redirect(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({
      success: false,
      error: {
        message: msg,
        code: 'OIDC_INITIALIZATION_ERROR',
      },
    });
  }
});

/**
 * GET /api/auth/telegram/callback
 * Handles OAuth callback, verifies state, exchanges code for ID Token, verifies signature via JWKS.
 */
router.get('/auth/telegram/callback', async (req: AuthenticatedRequest, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    res.status(400).send(`
      <!doctype html>
      <html>
        <head><title>Telegram Login Error</title></head>
        <body style="font-family: sans-serif; padding: 30px; text-align: center;">
          <h2>Telegram Login Cancelled or Failed</h2>
          <p style="color: #ef4444;">${error_description || error}</p>
          <a href="/" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #0c0c0c; color: #fff; border-radius: 8px; text-decoration: none;">Return to Telzo Cloud</a>
        </body>
      </html>
    `);
    return;
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    res.status(400).send('Invalid callback request. Missing code or state parameters.');
    return;
  }

  if (!req.session) {
    res.status(401).send('Session lost. Please initiate login again from TELZO CLOUD.');
    return;
  }

  try {
    const identity = await OidcService.handleCallback(req.session, code, state);

    if (res.locals.setSessionCookie) {
      res.locals.setSessionCookie(req.session.sessionId);
    }

    // Record verified OIDC user in SQLite database
    let userRec = dbService.findUserByOidcSub(identity.telegramId);
    if (!userRec) {
      userRec = dbService.createUser({
        id: req.session.userId,
        oidc_sub: identity.telegramId,
        telegram_user_id: identity.telegramId,
        username: identity.username,
        display_name: identity.displayName || identity.username || 'Telegram User',
      });
    } else {
      dbService.updateUser(userRec.id, {
        username: identity.username || userRec.username,
        display_name: identity.displayName || userRec.display_name,
      });
      // Point session to existing user ID if user already existed
      req.session.userId = userRec.id;
    }

    console.log(`[OIDC] Identity verified for Telegram user: ${identity.telegramId} (@${identity.username})`);

    res.redirect(`/?oidc_success=true&sub=${identity.telegramId}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[OIDC] Callback verification failure:', msg);
    res.status(400).send(`
      <!doctype html>
      <html>
        <head><title>Authentication Verification Failed</title></head>
        <body style="font-family: sans-serif; padding: 30px; text-align: center;">
          <h2>Telegram Identity Verification Failed</h2>
          <p style="color: #ef4444;">${msg}</p>
          <a href="/" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #0c0c0c; color: #fff; border-radius: 8px; text-decoration: none;">Return to Telzo Cloud</a>
        </body>
      </html>
    `);
  }
});

/**
 * POST /api/auth/telegram/disconnect
 * Disconnects Telegram account and revokes active TDLib client.
 */
router.post('/auth/telegram/disconnect', async (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    await TdlibService.logOut(req.session).catch(() => {});
    req.session.telegramState = 'unconfigured';
    req.session.oidcUser = undefined;
    req.session.user = undefined;
    req.session.phone = undefined;
    saveSessionsToDisk();
  }

  res.status(200).json({
    success: true,
    message: 'Disconnected from Telegram.',
  });
});

/**
 * POST /api/auth/logout
 * Destroys session completely and clears cookie.
 */
router.post('/auth/logout', async (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    await TdlibService.logOut(req.session).catch(() => {});
    deleteSession(req.session.sessionId);
  }

  res.clearCookie('telzo_sid');
  res.status(200).json({
    success: true,
    message: 'Successfully logged out.',
  });
});

/**
 * DELETE /api/account
 * Deletes user account, SQLite records, sessions, and unlinks data.
 */
router.delete('/account', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    return;
  }

  const userId = req.session.userId;
  try {
    await TdlibService.logOut(req.session).catch(() => {});
    dbService.deleteUserAccount(userId);
    deleteSession(req.session.sessionId);
    res.clearCookie('telzo_sid');

    res.status(200).json({
      success: true,
      message: `Account ${userId} and associated metadata have been deleted.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { message: msg, code: 'DELETE_ACCOUNT_ERROR' } });
  }
});

export default router;
