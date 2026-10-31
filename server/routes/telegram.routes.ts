import { Router, Response } from 'express';
import { AuthenticatedRequest, createSession } from '../middleware/session.js';
import { TelegramService } from '../services/telegram.service.js';

const router = Router();

/**
 * GET /api/telegram/status
 * Returns current TDLib backend readiness and credentials presence (without leaking secrets).
 */
router.get('/telegram/status', (req: AuthenticatedRequest, res: Response) => {
  const configStatus = TelegramService.getConfigurationStatus();

  res.status(200).json({
    success: true,
    data: {
      ...configStatus,
      session: req.session
        ? {
            sessionId: req.session.sessionId,
            telegramState: req.session.telegramState,
            phone: req.session.phone,
          }
        : null,
    },
  });
});

/**
 * POST /api/telegram/login
 * Body: { phone: string }
 * Initiates Telegram login.
 */
router.post('/telegram/login', async (req: AuthenticatedRequest, res: Response) => {
  const { phone } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Phone number is required and must be a string.',
        code: 'INVALID_INPUT',
      },
    });
    return;
  }

  // Ensure session exists or create a new one
  const session = req.session || createSession();

  const authResult = await TelegramService.startLogin(session, phone);

  if (!authResult.success) {
    res.status(400).json({
      success: false,
      sessionId: session.sessionId,
      error: {
        message: authResult.message,
        state: authResult.state,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    sessionId: session.sessionId,
    data: authResult,
  });
});

/**
 * POST /api/telegram/verify
 * Body: { code: string }
 * Header: x-session-id
 * Verifies authentication code.
 */
router.post('/telegram/verify', async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body || {};

  if (!req.session) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Session required. Call /api/telegram/login first to start login flow.',
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

  const verifyResult = await TelegramService.verifyCode(req.session, code);

  res.status(verifyResult.success ? 200 : 400).json({
    success: verifyResult.success,
    data: verifyResult,
  });
});

export default router;
