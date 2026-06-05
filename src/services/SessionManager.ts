import AWS from 'aws-sdk';
import { SessionManager } from '../types/services';
import { UserSession, GoogleUserProfile, AuthError, AuthErrorCode } from '../types';
import { TokenHandlerImpl } from './TokenHandler';
import { GoogleOAuthServiceImpl } from './GoogleOAuthService';
import { CognitoIdentityServiceImpl } from './CognitoIdentityService';
import { privacyService } from './PrivacyService';
import { secureStore, secureRetrieve, secureRemove, StorageType } from '../utils/storage';
import { securityConfig } from '../config/auth';

/**
 * Implementation of session management service
 * Handles user session lifecycle, validation, and cleanup
 */
export class SessionManagerImpl implements SessionManager {
  private tokenHandler: TokenHandlerImpl;
  private readonly sessionStorageKey: string;
  private readonly googleOAuthService: GoogleOAuthServiceImpl;
  private readonly cognitoService: CognitoIdentityServiceImpl;
  private reAuthenticationCallback?: (error: AuthError) => void;

  constructor() {
    this.googleOAuthService = new GoogleOAuthServiceImpl();
    this.cognitoService = new CognitoIdentityServiceImpl();
    this.tokenHandler = new TokenHandlerImpl(this.googleOAuthService, this.cognitoService);
    this.sessionStorageKey = securityConfig.sessionStorageKey;
  }

  /**
   * Sets a callback function to be called when re-authentication is required
   * @param callback Function to call when user needs to re-authenticate
   */
  setReAuthenticationCallback(callback: (error: AuthError) => void): void {
    this.reAuthenticationCallback = callback;
  }

  /**
   * Triggers re-authentication prompt when session expires or becomes invalid
   * @param reason Reason for re-authentication requirement
   */
  private triggerReAuthenticationPrompt(reason: string): void {
    const authError: AuthError = {
      code: AuthErrorCode.TOKEN_EXPIRED,
      message: `Re-authentication required: ${reason}`,
      timestamp: new Date()
    };

    if (this.reAuthenticationCallback) {
      this.reAuthenticationCallback(authError);
    } else {
      console.warn('Re-authentication required but no callback set:', reason);
    }
  }

  /**
   * Gets the current user session if valid
   * @returns Promise resolving to current session or null if invalid
   */
  async getCurrentSession(): Promise<UserSession | null> {
    try {
      // Check if we have valid tokens
      const hasValidTokens = await this.tokenHandler.hasValidTokens();
      if (!hasValidTokens) {
        this.triggerReAuthenticationPrompt('Invalid or expired tokens');
        return null;
      }

      // Get stored session data
      const sessionData = secureRetrieve(this.sessionStorageKey, StorageType.SESSION);
      if (!sessionData) {
        this.triggerReAuthenticationPrompt('No session data found');
        return null;
      }

      const session = JSON.parse(sessionData);
      
      // Validate session expiration
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt <= new Date()) {
        await this.clearSession();
        this.triggerReAuthenticationPrompt('Session has expired');
        return null;
      }

      // Reconstruct AWS credentials
      const awsCredentials = new AWS.Credentials({
        accessKeyId: session.awsCredentials.accessKeyId,
        secretAccessKey: session.awsCredentials.secretAccessKey,
        sessionToken: session.awsCredentials.sessionToken
      });

      return {
        cognitoIdentityId: session.cognitoIdentityId,
        awsCredentials: awsCredentials,
        googleProfile: session.googleProfile,
        expiresAt: expiresAt
      };
    } catch (error) {
      console.warn('Failed to get current session:', error);
      this.triggerReAuthenticationPrompt('Session retrieval failed');
      return null;
    }
  }

  /**
   * Refreshes the current session with new credentials
   * @returns Promise resolving to refreshed session
   */
  async refreshSession(): Promise<UserSession> {
    try {
      // Get current session to preserve user profile
      const currentSession = await this.getCurrentSession();
      if (!currentSession) {
        throw new Error('No current session to refresh');
      }

      // Refresh tokens
      const refreshedTokens = await this.tokenHandler.refreshTokenIfNeeded();
      
      // Create new session with refreshed credentials
      const newSession: UserSession = {
        cognitoIdentityId: refreshedTokens.cognitoCredentials.identityId,
        awsCredentials: new AWS.Credentials({
          accessKeyId: refreshedTokens.cognitoCredentials.accessKeyId,
          secretAccessKey: refreshedTokens.cognitoCredentials.secretAccessKey,
          sessionToken: refreshedTokens.cognitoCredentials.sessionToken
        }),
        googleProfile: currentSession.googleProfile,
        expiresAt: refreshedTokens.expiresAt
      };

      // Store the refreshed session
      await this.storeSession(newSession);
      
      return newSession;
    } catch (error) {
      const errorMessage = `Session refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.triggerReAuthenticationPrompt(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Clears the current session and all associated data
   * Privacy compliance: Ensures complete data removal
   */
  async clearSession(): Promise<void> {
    try {
      // Get current session for privacy logging
      const currentSession = await this.getCurrentSession();
      
      // Clear session data from all storage types
      secureRemove(this.sessionStorageKey, StorageType.SESSION);
      secureRemove(this.sessionStorageKey, StorageType.LOCAL);
      
      // Clear tokens
      await this.tokenHandler.clearTokens();
      
      // Clear any OAuth state data
      secureRemove(securityConfig.stateStorageKey, StorageType.SESSION);
      secureRemove(securityConfig.pkceStorageKey, StorageType.SESSION);
      
      // Privacy compliance: Log data clearing
      if (currentSession) {
        privacyService.clearUserData(currentSession.googleProfile);
      }
      
      // Privacy compliance: Only log in development mode
      if (import.meta.env.DEV) {
        console.debug('SessionManager: Session cleared successfully');
      }
    } catch (error) {
      // Privacy compliance: Generic warning without exposing session details
      if (import.meta.env.DEV) {
        console.warn('SessionManager: Failed to clear session completely');
      }
    }
  }

  /**
   * Gets user identity information from the current active session
   * @returns Promise resolving to user profile or null if no active session
   */
  async getUserIdentity(): Promise<GoogleUserProfile | null> {
    const session = await this.getCurrentSession();
    return session ? session.googleProfile : null;
  }

  /**
   * Gets AWS credentials from the current active session
   * @returns Promise resolving to AWS credentials or null if no active session
   */
  async getAwsCredentials(): Promise<AWS.Credentials | null> {
    const session = await this.getCurrentSession();
    return session ? session.awsCredentials : null;
  }

  /**
   * Gets Cognito identity ID from the current active session
   * @returns Promise resolving to identity ID or null if no active session
   */
  async getCognitoIdentityId(): Promise<string | null> {
    const session = await this.getCurrentSession();
    return session ? session.cognitoIdentityId : null;
  }

  /**
   * Checks if the current session is valid and not expired
   * @returns True if session is valid, false otherwise
   */
  isSessionValid(): boolean {
    try {
      const sessionData = secureRetrieve(this.sessionStorageKey, StorageType.SESSION);
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData);
      const expiresAt = new Date(session.expiresAt);
      
      // Check if session is expired
      if (expiresAt <= new Date()) {
        return false;
      }

      // Check if required session fields are present
      if (!session.cognitoIdentityId || !session.awsCredentials || !session.googleProfile) {
        return false;
      }

      // Check if AWS credentials are present
      const awsCreds = session.awsCredentials;
      if (!awsCreds.accessKeyId || !awsCreds.secretAccessKey || !awsCreds.sessionToken) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Monitors session expiration and automatically refreshes if needed
   * @returns Promise resolving to current session or null if refresh fails
   */
  async ensureValidSession(): Promise<UserSession | null> {
    try {
      const currentSession = await this.getCurrentSession();
      
      if (!currentSession) {
        return null;
      }

      // Check if session is close to expiration (within 5 minutes)
      const now = new Date();
      const expirationBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
      const timeUntilExpiration = currentSession.expiresAt.getTime() - now.getTime();

      if (timeUntilExpiration < expirationBuffer) {
        console.debug('Session is close to expiration, attempting refresh');
        try {
          return await this.refreshSession();
        } catch (refreshError) {
          console.warn('Session refresh failed:', refreshError);
          this.triggerReAuthenticationPrompt('Session refresh failed');
          return null;
        }
      }

      return currentSession;
    } catch (error) {
      console.warn('Session validation failed:', error);
      this.triggerReAuthenticationPrompt('Session validation failed');
      return null;
    }
  }

  /**
   * Creates and stores a new user session
   * Privacy compliance: Validates data minimization before storing
   * @param cognitoIdentityId Cognito identity ID
   * @param awsCredentials AWS credentials
   * @param googleProfile Google user profile
   * @param expiresAt Session expiration time
   * @returns Promise resolving to created session
   */
  async createSession(
    cognitoIdentityId: string,
    awsCredentials: AWS.Credentials,
    googleProfile: GoogleUserProfile,
    expiresAt: Date
  ): Promise<UserSession> {
    // Privacy compliance: Validate that user profile follows data minimization
    if (!privacyService.validateDataMinimization(googleProfile)) {
      throw new Error('User profile does not comply with data minimization requirements');
    }

    const session: UserSession = {
      cognitoIdentityId,
      awsCredentials,
      googleProfile,
      expiresAt
    };

    await this.storeSession(session);
    return session;
  }

  /**
   * Stores session data securely
   * Privacy compliance: Only stores in session storage, never persists beyond session
   * @param session User session to store
   */
  private async storeSession(session: UserSession): Promise<void> {
    try {
      // Privacy compliance: Validate data before storing
      const dataTypes = ['user_id', 'email', 'name', 'email_verified', 'auth_tokens', 'session_data'];
      if (!privacyService.validatePrivacyCompliance('session_storage', dataTypes)) {
        throw new Error('Session storage operation failed privacy compliance validation');
      }

      const sessionData = JSON.stringify({
        cognitoIdentityId: session.cognitoIdentityId,
        awsCredentials: {
          accessKeyId: session.awsCredentials.accessKeyId,
          secretAccessKey: session.awsCredentials.secretAccessKey,
          sessionToken: session.awsCredentials.sessionToken
        },
        googleProfile: session.googleProfile,
        expiresAt: session.expiresAt.toISOString()
      });

      // Privacy compliance: Only use session storage (cleared when browser closes)
      secureStore(this.sessionStorageKey, sessionData, StorageType.SESSION);
      
      // Privacy compliance: Only log in development mode with sanitized data
      if (import.meta.env.DEV) {
        console.debug('SessionManager: Session stored securely', 
          privacyService.sanitizeForLogging(session.googleProfile)
        );
      }
    } catch (error) {
      // Privacy compliance: Never expose session data in error messages
      const sanitizedError = error instanceof Error ? 
        error.message.replace(/[a-zA-Z0-9+/=]{20,}/g, '[DATA_REDACTED]') : 
        'Unknown error';
      throw new Error(`Failed to store session: ${sanitizedError}`);
    }
  }
}