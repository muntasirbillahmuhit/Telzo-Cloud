import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config/index.js';
import apiRouter from './server/routes/index.js';
import { sessionMiddleware } from './server/middleware/session.js';
import { errorHandler } from './server/middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = config.port;

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Session extraction middleware
  app.use(sessionMiddleware);

  // Mount modular REST API routes
  app.use('/api', apiRouter);

  // Central error handling middleware for API routes
  app.use(errorHandler);

  // Integrate Vite for frontend serving
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Telzo Cloud Server] listening on http://0.0.0.0:${PORT} (${config.nodeEnv})`);
  });
}

startServer().catch((err) => {
  console.error('[Telzo Cloud Server] Failed to start:', err);
  process.exit(1);
});
