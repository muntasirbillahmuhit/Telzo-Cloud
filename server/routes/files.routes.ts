import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { AuthenticatedRequest, createSession } from '../middleware/session.js';
import { CloudStorageService } from '../services/cloudStorage.service.js';

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
 * Query parameters: folderId (optional), tag (optional)
 */
router.get('/files', (req: AuthenticatedRequest, res: Response) => {
  const session = req.session || createSession();
  const folderId = req.query.folderId as string | undefined;
  const tag = req.query.tag as string | undefined;

  let files = CloudStorageService.getFiles(session, folderId);
  if (tag) {
    files = files.filter((f) => f.tag === tag);
  }

  res.status(200).json({
    success: true,
    data: files,
    files: files,
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
  upload.any(),
  async (req: AuthenticatedRequest, res: Response) => {
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

    const session = req.session || createSession();
    const savedRecords = [];
    const errors: string[] = [];

    for (const file of uploadedFiles) {
      try {
        const record = await CloudStorageService.uploadFile(
          session,
          file.buffer,
          file.originalname,
          file.mimetype,
          folderId || undefined,
          tag || undefined
        );
        savedRecords.push(record);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Upload] Failed to process ${file.originalname}:`, msg);
        errors.push(`${file.originalname}: ${msg}`);
      }
    }

    if (savedRecords.length === 0 && errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          message: errors.join('; '),
          code: 'UPLOAD_FAILED',
        },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: savedRecords,
      file: savedRecords[0],
      count: savedRecords.length,
    });
  }
);

/**
 * GET /api/files/:id/download
 * Streams the file content for downloading
 */
router.get('/files/:id/download', (req: AuthenticatedRequest, res: Response) => {
  const fileId = req.params.id as string;
  const session = req.session || createSession();
  const file = CloudStorageService.getFileById(session, fileId);

  if (!file) {
    res.status(404).json({
      success: false,
      error: {
        message: 'File not found.',
        code: 'FILE_NOT_FOUND',
      },
    });
    return;
  }

  if (file.localPath && fs.existsSync(file.localPath)) {
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.name)}"`
    );
    const stream = fs.createReadStream(file.localPath);
    stream.pipe(res);
    return;
  }

  res.status(404).json({
    success: false,
    error: {
      message: 'File binary is not cached on disk and Telegram media streaming is pending.',
      code: 'MEDIA_UNAVAILABLE',
    },
  });
});

/**
 * PATCH /api/files/:id
 * Body: { name: string }
 * Renames file metadata and logs to Index Channel.
 */
router.patch('/files/:id', async (req: AuthenticatedRequest, res: Response) => {
  const fileId = req.params.id as string;
  const { name } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      error: {
        message: 'New file name is required.',
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  const session = req.session || createSession();

  try {
    const updated = await CloudStorageService.renameFile(session, fileId, name);
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
        code: 'FILE_NOT_FOUND',
      },
    });
  }
});

/**
 * DELETE /api/files/:id
 * Deletes file from channel and index.
 */
router.delete('/files/:id', async (req: AuthenticatedRequest, res: Response) => {
  const fileId = req.params.id as string;
  const session = req.session || createSession();

  try {
    await CloudStorageService.deleteFile(session, fileId);
    res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({
      success: false,
      error: {
        message: msg,
        code: 'FILE_NOT_FOUND',
      },
    });
  }
});

export default router;
