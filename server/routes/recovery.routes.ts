import { Router, Response } from 'express';
import { AuthenticatedRequest, createSession } from '../middleware/session.js';
import { CloudStorageService } from '../services/cloudStorage.service.js';
import { TdlibService } from '../services/tdlib.service.js';

const router = Router();

/**
 * GET /api/recovery/status
 * Returns recovery state and Index Channel information.
 */
router.get('/recovery/status', (req: AuthenticatedRequest, res: Response) => {
  const session = req.session || createSession();
  const index = CloudStorageService.getUserIndex(session);

  res.status(200).json({
    success: true,
    data: {
      userId: index.userId,
      indexChannelId: session.indexChannelId || index.indexChannelId || null,
      folderCount: index.folders.filter((f) => f.status === 'active').length,
      fileCount: index.files.length,
      lastSyncedAt: new Date(index.lastSyncedAt).toISOString(),
    },
  });
});

/**
 * POST /api/recovery/scan
 * Scans Telegram private channels and Index Channel to restore folder mappings and file index.
 */
router.post('/recovery/scan', async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session || createSession();

  if (session.telegramState !== 'authenticated') {
    res.status(403).json({
      success: false,
      error: {
        message: 'Must be authorized with Telegram to scan and recover cloud channels.',
        code: 'AUTH_REQUIRED',
      },
    });
    return;
  }

  try {
    const indexChannelId = await TdlibService.getOrCreateIndexChannel(session);
    session.indexChannelId = indexChannelId;

    res.status(200).json({
      success: true,
      message: 'Channel scan and recovery completed successfully.',
      data: {
        indexChannelId,
        recoveredFolders: CloudStorageService.getFolders(session).length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      error: {
        message: `Recovery scan failed: ${msg}`,
        code: 'SCAN_FAILED',
      },
    });
  }
});

export default router;
