import { config } from '../config/index.js';
import { UserSession } from '../middleware/session.js';

export interface TelegramAuthResponse {
  success: boolean;
  state: 'unconfigured' | 'ready_for_tdlib' | 'awaiting_code' | 'authenticated';
  message: string;
  phoneCodeHash?: string;
  user?: {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
  };
}

export class TelegramService {
  /**
   * Check whether official Telegram API credentials have been configured.
   * To use official TDLib, TELEGRAM_API_ID and TELEGRAM_API_HASH from my.telegram.org are required.
   */
  public static getConfigurationStatus() {
    return {
      tdlibConfigured: config.telegram.isConfigured,
      apiIdPresent: Boolean(config.telegram.apiId),
      apiHashPresent: Boolean(config.telegram.apiHash),
      libraryPath: config.telegram.tdlibPath || 'default system path',
      status: config.telegram.isConfigured
        ? 'TDLib credentials detected on backend. Native TDLib wrapper can be initialized.'
        : 'TELEGRAM_API_ID and TELEGRAM_API_HASH are not set in .env. Obtain them from https://my.telegram.org to connect TDLib.',
    };
  }

  /**
   * Initiates official Telegram login (prepared for TDLib sendCode / setAuthenticationPhoneNumber).
   * Does NOT fake authentication. Validates input and reports real backend readiness.
   */
  public static async startLogin(
    session: UserSession,
    phoneNumber: string
  ): Promise<TelegramAuthResponse> {
    // Validate international phone format
    const cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{7,14}$/.test(cleanedPhone)) {
      return {
        success: false,
        state: 'unconfigured',
        message: 'Invalid phone number format. Please provide a valid international phone number (e.g., +1234567890).',
      };
    }

    if (!config.telegram.isConfigured) {
      return {
        success: false,
        state: 'unconfigured',
        message:
          'Telegram backend is not configured with official credentials. Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in your server .env file to enable TDLib authentication.',
      };
    }

    // In a fully built TDLib environment:
    // 1. A new TDLib client instance is spawned with session-specific database_directory.
    // 2. TDLib executes: client.send({ '@type': 'setAuthenticationPhoneNumber', phone_number: cleanedPhone })
    // 3. TDLib responds with authorizationStateWaitCode and phone_code_hash.
    session.phone = cleanedPhone;
    session.telegramState = 'awaiting_code';

    return {
      success: true,
      state: 'ready_for_tdlib',
      message:
        'TDLib credentials verified on backend. TDLib client requires official native library bindings to dispatch verification SMS/Telegram code.',
    };
  }

  /**
   * Verifies the Telegram security code (prepared for TDLib checkAuthenticationCode).
   */
  public static async verifyCode(
    session: UserSession,
    code: string
  ): Promise<TelegramAuthResponse> {
    if (!code || code.trim().length < 4) {
      return {
        success: false,
        state: session.telegramState,
        message: 'Verification code must be at least 4 digits.',
      };
    }

    if (!config.telegram.isConfigured) {
      return {
        success: false,
        state: 'unconfigured',
        message:
          'Telegram backend is not configured with official credentials. Cannot verify code without TELEGRAM_API_ID and TELEGRAM_API_HASH.',
      };
    }

    return {
      success: false,
      state: 'ready_for_tdlib',
      message:
        'TDLib verification endpoint reached. To complete actual Telegram login, compile the native TDLib binary for your operating system.',
    };
  }
}
