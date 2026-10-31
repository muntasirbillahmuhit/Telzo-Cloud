import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/health
 * Returns service status, uptime, environment, and backend configuration readiness.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Telzo Cloud Backend',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    tdlibReady: config.telegram.isConfigured,
  });
});

export default router;
