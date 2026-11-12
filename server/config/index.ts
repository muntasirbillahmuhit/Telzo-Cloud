import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file if present
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-key-32-chars-long!',
  sessionEncryptionKey:
    process.env.SESSION_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  telegram: {
    oidc: {
      clientId: process.env.TELEGRAM_OIDC_CLIENT_ID || undefined,
      clientSecret: process.env.TELEGRAM_OIDC_CLIENT_SECRET || undefined,
      redirectUri:
        process.env.TELEGRAM_OIDC_REDIRECT_URI ||
        'http://localhost:3000/api/auth/telegram/callback',
      isConfigured: Boolean(
        process.env.TELEGRAM_OIDC_CLIENT_ID && process.env.TELEGRAM_OIDC_CLIENT_SECRET
      ),
    },
    apiId: process.env.TELEGRAM_API_ID ? Number(process.env.TELEGRAM_API_ID) : undefined,
    apiHash: process.env.TELEGRAM_API_HASH || undefined,
    tdlibPath: process.env.TDLIB_LIBRARY_PATH || undefined,
    tdlibDataDir: path.resolve(process.cwd(), process.env.TDLIB_DATA_DIR || './data/tdlib'),
    telzoDataDir: path.resolve(process.cwd(), process.env.TELZO_DATA_DIR || './data/telzo'),
    isConfigured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH),
  },
};
