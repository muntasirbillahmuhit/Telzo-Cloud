import { Router } from 'express';
import healthRoutes from './health.routes.js';
import telegramRoutes from './telegram.routes.js';
import folderRoutes from './folders.routes.js';
import fileRoutes from './files.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(telegramRoutes);
apiRouter.use(folderRoutes);
apiRouter.use(fileRoutes);

export default apiRouter;
