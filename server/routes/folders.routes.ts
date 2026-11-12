import { Router, Response } from 'express';
import { AuthenticatedRequest, createSession } from '../middleware/session.js';
import { CloudStorageService } from '../services/cloudStorage.service.js';

const router = Router();

/**
 * GET /api/folders
 * Returns all active folders for the authenticated user session.
 */
router.get('/folders', (req: AuthenticatedRequest, res: Response) => {
  const session = req.session || createSession();
  const folders = CloudStorageService.getFolders(session);

  res.status(200).json({
    success: true,
    data: folders,
    folders: folders,
    count: folders.length,
    indexChannelId: session.indexChannelId || null,
  });
});

/**
 * POST /api/folders
 * Body: { name: string, description?: string, color?: string }
 * Creates a folder with its own separate private Telegram channel and records in Index Channel.
 */
router.post('/folders', async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, color } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Folder name is required and cannot be empty.',
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  const session = req.session || createSession();

  try {
    const folder = await CloudStorageService.createFolder(
      session,
      name,
      description,
      color
    );

    res.status(201).json({
      success: true,
      data: folder,
      folder: folder,
      message: folder.telegramChannelId
        ? 'Created folder with dedicated private Telegram channel.'
        : 'Created folder (Telegram channel will link once TDLib is authorized).',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      error: {
        message: msg,
        code: 'FOLDER_CREATION_FAILED',
      },
    });
  }
});

/**
 * PATCH /api/folders/:id
 * Body: { name: string }
 * Renames a folder and preserves its private Telegram channel ID.
 */
router.patch('/folders/:id', async (req: AuthenticatedRequest, res: Response) => {
  const folderId = req.params.id as string;
  const { name } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      error: {
        message: 'New folder name is required.',
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  const session = req.session || createSession();

  try {
    const updated = await CloudStorageService.renameFolder(session, folderId, name);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({
      success: false,
      error: {
        message: msg,
        code: 'FOLDER_NOT_FOUND',
      },
    });
  }
});

/**
 * DELETE /api/folders/:id
 * Deletes folder from user's cloud index and logs deletion in Index Channel.
 */
router.delete('/folders/:id', async (req: AuthenticatedRequest, res: Response) => {
  const folderId = req.params.id as string;
  const session = req.session || createSession();

  try {
    await CloudStorageService.deleteFolder(session, folderId);
    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({
      success: false,
      error: {
        message: msg,
        code: 'FOLDER_NOT_FOUND',
      },
    });
  }
});

export default router;
