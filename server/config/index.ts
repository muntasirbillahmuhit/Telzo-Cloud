import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-key-32-chars-long!',
  telegram: {
    apiId: process.env.TELEGRAM_API_ID ? Number(process.env.TELEGRAM_API_ID) : undefined,
    apiHash: process.env.TELEGRAM_API_HASH || undefined,
    tdlibPath: process.env.TDLIB_LIBRARY_PATH || undefined,
    // TDLib requires API ID and Hash from my.telegram.org
    isConfigured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH),
  },
};
