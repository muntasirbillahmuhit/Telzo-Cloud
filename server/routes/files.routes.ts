import { Router, Request, Response } from 'express';
import multer from 'multer';
import { storageService } from '../services/storage.service.js';

const router = Router();

// Configure memory storage for uploaded files (up to 50MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});

/**
 * GET /api/files
 * Query parameters: folderId (optional)
 */
router.get('/files', (req: Request, res: Response) => {
  const folderId = req.query.folderId as string | undefined;
  const files = storageService.getFiles(folderId);

  res.status(200).json({
    success: true,
    data: files,
    count: files.length,
  });
});

/**
 * POST /api/files/upload
 * Multi-part form data:
 * - files (one or more files)
 * - folderId (optional)
 * - tag (optional)
 */
router.post(
  '/files/upload',
  upload.array('files', 10),
  (req: Request, res: Response) => {
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const { folderId, tag } = req.body || {};

    if (uploadedFiles.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No files provided. Send files under form-data key "files".',
          code: 'NO_FILES',
        },
      });
      return;
    }

    const savedFiles = uploadedFiles.map((file) =>
      storageService.saveUploadedFile({
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        folderId: folderId || undefined,
        tag: tag || undefined,
      })
    );

    res.status(201).json({
      success: true,
      data: savedFiles,
      count: savedFiles.length,
    });
  }
);

export default router;
