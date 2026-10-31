import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage.service.js';

const router = Router();

/**
 * GET /api/folders
 * Returns all folders stored on backend.
 */
router.get('/folders', (_req: Request, res: Response) => {
  const folders = storageService.getFolders();
  res.status(200).json({
    success: true,
    data: folders,
    count: folders.length,
  });
});

/**
 * POST /api/folders
 * Body: { name: string, description?: string, color?: string, isTelegramGroup?: boolean }
 */
router.post('/folders', (req: Request, res: Response) => {
  const { name, description, color, isTelegramGroup } = req.body || {};

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

  const folder = storageService.createFolder({
    name,
    description,
    color,
    isTelegramGroup,
  });

  res.status(201).json({
    success: true,
    data: folder,
  });
});

export default router;
