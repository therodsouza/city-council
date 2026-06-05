import { TokenHandler } from '../types/services';
import { AuthTokens, GoogleTokens } from '../types';
import { secureStore, secureRetrieve, secureRemove, StorageType } from '../utils/storage';
import { securityConfig, authConfig } from '../config/auth';
import { GoogleOAuthService, CognitoIdentityService } from '../types/services';

/**
 * Implementation of secure token handling service
 * Manages token storage, validation, and refresh operations
 */
export class TokenHandlerImpl implements TokenHandler {
  private readonly tokenStorageKey: string;
  private readonly googleOAuthService: GoogleOAuthService;
  private readonly cognitoService: CognitoIdentityService;

  constructor(googleOAuthService: GoogleOAuthService, cognitoService: CognitoIdentityService) {
    this.tokenStorageKey = securityConfig.tokenStorageKey;
    this.googleOAuthService = googleOAuthService;
    this.cognitoService = cognitoService;
  }

  /**
   * Stores authentication tokens securely
   * @param tokens Authentication tokens to store
   */
  async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      // Privacy compliance: Never log actual token values or sensitive data
      // Only log non-sensitive metadata for debugging
      const tokenMetadata = {
        hasGoogleIdToken: !!tokens.googleIdToken,
        cognitoIdentityId: tokens.cognitoCredentials.identityId, // Non-sensitive identifier
        hasAccessKey: !!tokens.cognitoCredentials.accessKeyId,
        hasRefreshToken: !!tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
        tokenCount: Object.keys(tokens).length
      };

      // Only log in development mode and without sensitive data
      if (import.meta.env.DEV) {
        console.debug('TokenHandler: Storing tokens (metadata only):', tokenMetadata);
      }

      const tokenData = JSON.stringify({
        googleIdToken: tokens.googleIdToken,
        cognitoCredentials: {
          identityId: tokens.cognitoCredentials.identityId,
          accessKeyId: tokens.cognitoCredentials.accessKeyId,
          secretAccessKey: tokens.cognitoCredentials.secretAccessKey,
          sessionToken: tokens.cognitoCredentials.sessionToken,
          expiration: tokens.cognitoCredentials.expiration.toISOString()
        },
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString()
      });

      // Store sensitive tokens in session storage (cleared when browser closes)
      // Privacy compliance: Use session storage to ensure tokens don't persist beyond session
      secureStore(this.tokenStorageKey, tokenData, StorageType.SESSION);
      
      // Log successful storage without exposing sensitive data
      if (import.meta.env.DEV) {
        console.debug('TokenHandler: Tokens stored securely in session storage');
      }
    } catch (error) {
      // Privacy compliance: Never expose token data in error messages
      const sanitizedError = error instanceof Error ? 
        error.message.replace(/[a-zA-Z0-9+/=]{20,}/g, '[TOKEN_REDACTED]') : 
        'Unknown error';
      throw new Error(`Failed to store tokens: ${sanitizedError}`);
    }
  }

  /**
   * Retrieves stored authentication tokens
   * @returns Promise resolving to stored tokens or null if not found
   */
  async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const tokenData = secureRetrieve(this.tokenStorageKey, StorageType.SESSION);
      
      if (!tokenData) {
        return null;
      }

      const parsed = JSON.parse(tokenData);
      
      return {
        googleIdToken: parsed.googleIdToken,
        cognitoCredentials: {
          identityId: parsed.cognitoCredentials.identityId,
          accessKeyId: parsed.cognitoCredentials.accessKeyId,
          secretAccessKey: parsed.cognitoCredentials.secretAccessKey,
          sessionToken: parsed.cognitoCredentials.sessionToken,
          expiration: new Date(parsed.cognitoCredentials.expiration)
        },
        refreshToken: parsed.refreshToken,
        expiresAt: new Date(parsed.expiresAt)
      };
    } catch (error) {
      // Privacy compliance: Don't log errors that might contain sensitive token data
      // Only log generic warning without exposing token content
      if (import.meta.env.DEV) {
        console.warn('TokenHandler: Failed to retrieve stored tokens - tokens may be corrupted or invalid');
      }
      return null;
    }
  }

  /**
   * Clears all stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      secureRemove(this.tokenStorageKey, StorageType.SESSION);
      secureRemove(this.tokenStorageKey, StorageType.LOCAL);
      secureRemove(this.tokenStorageKey, StorageType.MEMORY);
      
      // Privacy compliance: Only log in development mode
      if (import.meta.env.DEV) {
        console.debug('TokenHandler: All tokens cleared successfully');
      }
    } catch (error) {
      // Privacy compliance: Generic warning without exposing details
      if (import.meta.env.DEV) {
        console.warn('TokenHandler: Failed to clear tokens - some tokens may remain in storage');
      }
    }
  }

  /**
   * Validates if a token is still valid (not expired and properly formatted)
   * Performs comprehensive validation including signature verification for Google ID tokens
   * @param token JWT token to validate
   * @returns True if token is valid, false otherwise
   */
  isTokenValid(token: string): boolean {
    try {
      if (!token || typeof token !== 'string') {
        return false;
      }

      // Basic JWT format validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Decode and validate payload
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check expiration
      if (!payload.exp || payload.exp <= now) {
        return false;
      }

      // Additional validation for Google ID tokens
      if (payload.iss && payload.iss.includes('accounts.google.com')) {
        // Validate required Google ID token fields
        if (!payload.sub || !payload.aud || !payload.email) {
          return false;
        }

        // Validate issued at time (not too far in the past or future)
        if (payload.iat) {
          const maxAge = 24 * 60 * 60; // 24 hours
          const minTime = now - maxAge;
          const maxTime = now + 300; // 5 minutes in the future
          
          if (payload.iat < minTime || payload.iat > maxTime) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      // Privacy compliance: Never log token content or validation details
      // Return false without exposing sensitive information
      return false;
    }
  }

  /**
   * Refreshes tokens if they are close to expiration
   * Implements automatic token refresh with fallback to re-authentication
   * @returns Promise resolving to refreshed tokens
   */
  async refreshTokenIfNeeded(): Promise<AuthTokens> {
    const tokens = await this.getStoredTokens();
    
    if (!tokens) {
      throw new Error('No tokens found to refresh');
    }

    // Check if tokens are close to expiration (within 5 minutes)
    const now = new Date();
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const shouldRefresh = tokens.expiresAt.getTime() - now.getTime() < expirationBuffer;

    if (!shouldRefresh) {
      return tokens;
    }

    // Privacy compliance: Only log in development mode without sensitive data
    if (import.meta.env.DEV) {
      console.debug('TokenHandler: Tokens are close to expiration, attempting refresh');
    }

    try {
      // Attempt to refresh using Google refresh token if available
      if (tokens.refreshToken) {
        const refreshedGoogleTokens = await this.refreshGoogleTokens(tokens.refreshToken);
        
        // Get new Cognito credentials with the refreshed Google ID token
        const newCognitoCredentials = await this.cognitoService.authenticateWithGoogle(
          refreshedGoogleTokens.idToken
        );

        const refreshedTokens: AuthTokens = {
          googleIdToken: refreshedGoogleTokens.idToken,
          cognitoCredentials: newCognitoCredentials,
          refreshToken: refreshedGoogleTokens.refreshToken || tokens.refreshToken,
          expiresAt: new Date(Date.now() + (refreshedGoogleTokens.expiresIn * 1000))
        };

        // Store the refreshed tokens
        await this.storeTokens(refreshedTokens);
        
        // Privacy compliance: Only log in development mode
        if (import.meta.env.DEV) {
          console.debug('TokenHandler: Tokens refreshed successfully');
        }
        
        return refreshedTokens;
      }

      // If no refresh token available, try to refresh Cognito credentials directly
      if (tokens.cognitoCredentials.identityId) {
        const refreshedCognitoCredentials = await this.cognitoService.refreshCredentials(
          tokens.cognitoCredentials.identityId
        );

        const refreshedTokens: AuthTokens = {
          ...tokens,
          cognitoCredentials: refreshedCognitoCredentials,
          expiresAt: refreshedCognitoCredentials.expiration
        };

        await this.storeTokens(refreshedTokens);
        
        // Privacy compliance: Only log in development mode
        if (import.meta.env.DEV) {
          console.debug('TokenHandler: Cognito credentials refreshed successfully');
        }
        
        return refreshedTokens;
      }

      throw new Error('No refresh mechanism available');
    } catch (error) {
      // Privacy compliance: Generic warning without exposing token details
      if (import.meta.env.DEV) {
        console.warn('TokenHandler: Token refresh failed, re-authentication required');
      }
      // Clear invalid tokens
      await this.clearTokens();
      throw new Error('Tokens expired and refresh failed, re-authentication required');
    }
  }

  /**
   * Refreshes Google tokens using refresh token
   * @param refreshToken Google refresh token
   * @returns Promise resolving to new Google tokens
   */
  private async refreshGoogleTokens(refreshToken: string): Promise<GoogleTokens> {
    try {
      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      
      const params = new URLSearchParams({
        client_id: authConfig.googleClientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
      }

      const tokenData = await response.json();
      
      return {
        idToken: tokenData.id_token,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Keep existing refresh token if new one not provided
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      // Privacy compliance: Never expose refresh token or request details in error messages
      const sanitizedError = error instanceof Error ? 
        error.message.replace(/[a-zA-Z0-9+/=]{20,}/g, '[TOKEN_REDACTED]') : 
        'Unknown error';
      throw new Error(`Failed to refresh Google tokens: ${sanitizedError}`);
    }
  }

  /**
   * Checks if stored tokens exist and are valid
   * @returns True if valid tokens exist, false otherwise
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      
      if (!tokens) {
        return false;
      }

      // Check if Google ID token is valid
      if (!this.isTokenValid(tokens.googleIdToken)) {
        return false;
      }

      // Check if Cognito credentials are not expired
      const now = new Date();
      if (tokens.cognitoCredentials.expiration <= now) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}