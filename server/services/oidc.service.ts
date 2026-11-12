import crypto from 'crypto';
import * as jose from 'jose';
import { config } from '../config/index.js';
import { OidcIdentity, UserSession, saveSessionsToDisk } from '../middleware/session.js';

const TELEGRAM_OIDC_ISSUER = 'https://oauth.telegram.org';
const TELEGRAM_JWKS_URL = new URL('https://oauth.telegram.org/.well-known/jwks.json');
const TELEGRAM_AUTH_ENDPOINT = 'https://oauth.telegram.org/auth';
const TELEGRAM_TOKEN_ENDPOINT = 'https://oauth.telegram.org/token';

// Cache remote JWKS instance for performance
let remoteJWKSet: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getRemoteJWKS() {
  if (!remoteJWKSet) {
    remoteJWKSet = jose.createRemoteJWKSet(TELEGRAM_JWKS_URL);
  }
  return remoteJWKSet;
}

// Generate base64url PKCE code verifier and challenge (S256)
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export class OidcService {
  /**
   * Checks OIDC configuration status
   */
  public static getStatus() {
    return {
      configured: config.telegram.oidc.isConfigured,
      clientIdPresent: Boolean(config.telegram.oidc.clientId),
      clientSecretPresent: Boolean(config.telegram.oidc.clientSecret),
      redirectUri: config.telegram.oidc.redirectUri,
      issuer: TELEGRAM_OIDC_ISSUER,
      endpoints: {
        authorization: TELEGRAM_AUTH_ENDPOINT,
        token: TELEGRAM_TOKEN_ENDPOINT,
        jwks: TELEGRAM_JWKS_URL.toString(),
      },
      instructions: config.telegram.oidc.isConfigured
        ? 'Telegram OIDC client is configured on backend.'
        : 'To enable Telegram Login (OIDC), register your domain with @BotFather and set TELEGRAM_OIDC_CLIENT_ID and TELEGRAM_OIDC_CLIENT_SECRET in .env.',
    };
  }

  /**
   * Prepares Telegram OIDC authorization URL with PKCE (S256), state and nonce
   */
  public static createAuthorizationRequest(session: UserSession) {
    if (!config.telegram.oidc.isConfigured) {
      throw new Error(
        'Telegram OIDC is not configured. Set TELEGRAM_OIDC_CLIENT_ID and TELEGRAM_OIDC_CLIENT_SECRET in your server environment.'
      );
    }

    const state = crypto.randomBytes(24).toString('hex');
    const nonce = crypto.randomBytes(24).toString('hex');
    const { verifier, challenge } = generatePKCE();

    session.oidcState = {
      state,
      nonce,
      codeVerifier: verifier,
      createdAt: Date.now(),
    };
    saveSessionsToDisk();

    const authUrl = new URL(TELEGRAM_AUTH_ENDPOINT);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.telegram.oidc.clientId!);
    authUrl.searchParams.set('redirect_uri', config.telegram.oidc.redirectUri);
    authUrl.searchParams.set('scope', 'openid profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return {
      url: authUrl.toString(),
      state,
      nonce,
    };
  }

  /**
   * Handles OIDC callback, validates state, exchanges code with PKCE, and verifies ID Token
   */
  public static async handleCallback(
    session: UserSession,
    code: string,
    state: string
  ): Promise<OidcIdentity> {
    if (!config.telegram.oidc.isConfigured) {
      throw new Error('Telegram OIDC credentials are not configured on the backend.');
    }

    if (!session.oidcState || session.oidcState.state !== state) {
      throw new Error('Invalid OAuth state. Potential CSRF or expired authorization attempt.');
    }

    // State is single-use; consume it
    const { nonce, codeVerifier, createdAt } = session.oidcState;
    session.oidcState = undefined;
    saveSessionsToDisk();

    // Verify state freshness (max 10 minutes)
    if (Date.now() - createdAt > 10 * 60 * 1000) {
      throw new Error('Authorization session expired. Please start login again.');
    }

    // Exchange authorization code for tokens
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.telegram.oidc.redirectUri,
      client_id: config.telegram.oidc.clientId!,
      client_secret: config.telegram.oidc.clientSecret!,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(TELEGRAM_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[OIDC] Token endpoint exchange error:', errText);
      throw new Error(`Failed to exchange authorization code for tokens: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      throw new Error('No id_token received in Telegram token response.');
    }

    // Verify ID token signature using Telegram's official JWKS
    const JWKS = getRemoteJWKS();
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: TELEGRAM_OIDC_ISSUER,
      audience: config.telegram.oidc.clientId,
    });

    // Validate nonce
    if (payload.nonce !== nonce) {
      throw new Error('ID Token nonce validation failed.');
    }

    const telegramId = String(payload.sub);
    if (!telegramId) {
      throw new Error('Missing sub claim in Telegram ID token.');
    }

    const identity: OidcIdentity = {
      telegramId,
      username: (payload.preferred_username as string) || undefined,
      displayName: (payload.name as string) || (payload.preferred_username as string) || `User ${telegramId}`,
      photoUrl: (payload.picture as string) || undefined,
      verifiedAt: Date.now(),
    };

    session.oidcUser = identity;
    saveSessionsToDisk();

    return identity;
  }
}
