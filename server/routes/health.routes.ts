import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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

/**
 * GET /api/test-persistence
 * Checks whether test-persistence.txt exists on the root filesystem and returns details.
 */
router.get('/test-persistence', (_req: Request, res: Response) => {
  const rootDir = process.cwd();
  const filePath = path.resolve(rootDir, 'test-persistence.txt');
  const exists = fs.existsSync(filePath);

  if (exists) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      res.status(200).json({
        exists: true,
        filename: 'test-persistence.txt',
        path: filePath,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        content,
        checkedAt: new Date().toISOString(),
        serverUptimeSeconds: Math.floor(process.uptime()),
        message: 'Persistence test file is present in root directory.',
      });
      return;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        exists: true,
        error: `File exists but could not be read: ${errMsg}`,
        checkedAt: new Date().toISOString(),
      });
      return;
    }
  }

  res.status(200).json({
    exists: false,
    filename: 'test-persistence.txt',
    path: filePath,
    checkedAt: new Date().toISOString(),
    serverUptimeSeconds: Math.floor(process.uptime()),
    message: 'test-persistence.txt does NOT exist in the root directory. Run scripts/create-test-persistence.js to create it.',
  });
});

/**
 * POST /api/test-persistence
 * Creates or touches test-persistence.txt directly via backend.
 */
router.post('/test-persistence', (_req: Request, res: Response) => {
  const rootDir = process.cwd();
  const filePath = path.resolve(rootDir, 'test-persistence.txt');
  const now = new Date();

  const fileContent = [
    '=== TELZO CLOUD PERSISTENCE TEST FILE ===',
    `Created At: ${now.toISOString()}`,
    `Created Locale: ${now.toLocaleString()}`,
    `Platform: ${os.platform()} (${os.arch()})`,
    `Node.js: ${process.version}`,
    `Hostname: ${os.hostname()}`,
    `Process PID: ${process.pid}`,
    `Working Directory: ${rootDir}`,
    'Status: ACTIVE',
    'Description: This file verifies whether files created in the sandbox root directory persist across dev server restarts, container lifecycles, and browser refreshes.',
    '=========================================',
  ].join('\n');

  try {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    const stats = fs.statSync(filePath);
    res.status(201).json({
      success: true,
      exists: true,
      filename: 'test-persistence.txt',
      path: filePath,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      content: fileContent,
      message: 'Successfully generated test-persistence.txt in root directory.',
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      error: `Failed to write test-persistence.txt: ${errMsg}`,
    });
  }
});

export default router;

