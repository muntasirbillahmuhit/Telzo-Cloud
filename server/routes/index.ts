import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import telegramRoutes from './telegram.routes.js';
import folderRoutes from './folders.routes.js';
import fileRoutes from './files.routes.js';
import recoveryRoutes from './recovery.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(authRoutes);
apiRouter.use(telegramRoutes);
apiRouter.use(folderRoutes);
apiRouter.use(fileRoutes);
apiRouter.use(recoveryRoutes);

export default apiRouter;
