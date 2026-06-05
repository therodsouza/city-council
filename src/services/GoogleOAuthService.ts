import { GoogleOAuthService } from '../types/services';
import { AuthUrlResult, GoogleTokens, GoogleTokenPayload, AuthErrorCode } from '../types';
import { authConfig } from '../config/auth';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/crypto';
import { errorHandler } from './ErrorHandlingService';
import { securityService } from './SecurityService';

/**
 * Implementation of Google OAuth 2.0 service with PKCE support
 * Handles OAuth flow initiation, token exchange, and token validation
 */
export class GoogleOAuthServiceImpl implements GoogleOAuthService {
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];

  constructor() {
    this.clientId = authConfig.googleClientId;
    this.redirectUri = authConfig.redirectUri;
    this.scopes = authConfig.scopes;
  }

  /**
   * Generates OAuth authorization URL using implicit/token flow.
   * This avoids the client_secret requirement for Web application client types
   * by requesting the id_token directly in the URL fragment.
   */
  async generateAuthUrl(redirectUri?: string): Promise<AuthUrlResult> {
    securityService.validatePageSecurity();

    const finalRedirectUri = redirectUri || this.redirectUri;
    const state = securityService.generateCSRFState(finalRedirectUri);

    // Use token response_type to get id_token directly (no code exchange needed)
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: finalRedirectUri,
      response_type: 'token id_token',
      scope: this.scopes.join(' '),
      state: state,
      nonce: Math.random().toString(36).substring(2),
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // codeVerifier/codeChallenge not used in implicit flow but kept for interface compatibility
    return { authUrl, state, codeVerifier: '', codeChallenge: '' };
  }

  /**
   * Exchanges authorization code for tokens using PKCE
   * For Web application client types, uses implicit token flow via GIS
   * to avoid client_secret requirement in browser environments.
   */
  async exchangeCodeForTokens(code: string, codeVerifier: string, state?: string): Promise<GoogleTokens> {
    try {
      // Validate state parameter for CSRF protection
      if (state) {
        securityService.validateCSRFState(state, this.redirectUri);
      }

      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        code: code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      });

      // Use plain fetch for Google token endpoint - custom headers trigger CORS preflight
      // which Google's token endpoint does not support. PKCE provides the security here.
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error_description || response.statusText;
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          `Token exchange failed: ${errorMessage}`,
          { 
            status: response.status, 
            statusText: response.statusText,
            errorData: errorData
          }
        );
      }

      const tokenData = await response.json();
      
      return {
        idToken: tokenData.id_token,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Token exchange failed')) {
        throw error;
      }
      throw errorHandler.classifyError(error, 'GoogleOAuthService.exchangeCodeForTokens');
    }
  }

  /**
   * Validates and parses Google ID token
   * @param idToken JWT ID token from Google
   * @returns Promise resolving to parsed token payload
   */
  async validateIdToken(idToken: string): Promise<GoogleTokenPayload> {
    try {
      // NOTE: For production, JWT signature validation against Google's public keys should be implemented
      // This implementation provides comprehensive payload validation but not signature verification
      if (!idToken || typeof idToken !== 'string') {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'ID token is required and must be a string',
          { tokenType: typeof idToken }
        );
      }

      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'Invalid JWT format: token must have 3 parts separated by dots',
          { partsCount: parts.length }
        );
      }

      // Decode and parse payload
      // JWT uses base64url (replaces + with -, / with _, strips = padding);
      // atob() requires standard base64, so convert first.
      let payload: any;
      try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        payload = JSON.parse(atob(padded));
      } catch (decodeError) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'Invalid JWT payload: unable to decode base64',
          { decodeError }
        );
      }
      
      // Validate required fields
      const requiredFields = ['iss', 'aud', 'sub', 'exp', 'iat'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      if (missingFields.length > 0) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          `Invalid token payload: missing required fields: ${missingFields.join(', ')}`,
          { missingFields, payload: payload }
        );
      }

      // Validate issuer
      const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
      if (!validIssuers.includes(payload.iss)) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          `Invalid token issuer: expected Google, got ${payload.iss}`,
          { issuer: payload.iss, validIssuers }
        );
      }

      // Validate audience (client ID)
      if (payload.aud !== this.clientId) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          `Invalid token audience: expected ${this.clientId}, got ${payload.aud}`,
          { expectedAudience: this.clientId, actualAudience: payload.aud }
        );
      }

      // Check expiration with 5-minute clock skew tolerance
      const now = Math.floor(Date.now() / 1000);
      const clockSkewTolerance = 300; // 5 minutes
      if (payload.exp < (now - clockSkewTolerance)) {
        throw errorHandler.createError(
          AuthErrorCode.TOKEN_EXPIRED,
          'Token has expired',
          { 
            expiration: payload.exp, 
            currentTime: now, 
            clockSkewTolerance 
          }
        );
      }

      // Check issued at time (not too far in the future)
      if (payload.iat > (now + clockSkewTolerance)) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'Token issued in the future',
          { 
            issuedAt: payload.iat, 
            currentTime: now, 
            clockSkewTolerance 
          }
        );
      }

      // Validate email field if present
      if (payload.email && typeof payload.email !== 'string') {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'Invalid email field in token',
          { emailType: typeof payload.email }
        );
      }

      // Validate email_verified field if present
      if (payload.email_verified !== undefined && typeof payload.email_verified !== 'boolean') {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'Invalid email_verified field in token',
          { emailVerifiedType: typeof payload.email_verified }
        );
      }

      return payload as GoogleTokenPayload;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Token')) {
        throw error; // Re-throw already classified errors
      }
      throw errorHandler.classifyError(error, 'GoogleOAuthService.validateIdToken');
    }
  }
}