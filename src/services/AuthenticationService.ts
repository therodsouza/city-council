import AWS from 'aws-sdk';
import { 
  GoogleOAuthService, 
  CognitoIdentityService, 
  TokenHandler, 
  SessionManager,
  TokenRefreshManager
} from '../types/services';
import { 
  GoogleUserProfile, 
  CognitoCredentials, 
  AuthError, 
  AuthErrorCode,
  UserSession,
  AuthTokens,
  GoogleTokens
} from '../types';
import { GoogleOAuthServiceImpl } from './GoogleOAuthService';
import { CognitoIdentityServiceImpl } from './CognitoIdentityService';
import { TokenHandlerImpl } from './TokenHandler';
import { SessionManagerImpl } from './SessionManager';
import { errorHandler } from './ErrorHandlingService';
import { privacyService } from './PrivacyService';
import { TokenRefreshManagerImpl } from './TokenRefreshManager';

/**
 * AuthenticationService - Central orchestrator for authentication flow
 * 
 * This service wires together GoogleOAuth, Cognito, Token, and Session services
 * to provide a complete authentication flow from login to AWS credential access.
 * 
 * Features:
 * - Complete OAuth flow orchestration
 * - Automatic token management and refresh
 * - Session lifecycle management
 * - Error propagation and handling
 * - Privacy compliance
 * - Security best practices
 */
export interface AuthenticationService {
  // Authentication flow methods
  initiateGoogleAuth(): Promise<string>;
  completeGoogleAuth(code: string, state: string): Promise<GoogleUserProfile>;
  completeGoogleAuthImplicit(idToken: string, accessToken: string, state: string): Promise<GoogleUserProfile>;
  
  // Session management
  getCurrentUser(): Promise<GoogleUserProfile | null>;
  getAwsCredentials(): Promise<AWS.Credentials | null>;
  getCognitoIdentityId(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
  
  // Token management
  refreshTokens(): Promise<void>;
  
  // Logout
  logout(): Promise<void>;
  
  // Event handling
  onReAuthenticationRequired(callback: (error: AuthError) => void): void;
  
  // Background token refresh management
  startBackgroundTokenRefresh(): void;
  stopBackgroundTokenRefresh(): void;
  isBackgroundRefreshActive(): boolean;
}

/**
 * Implementation of the central authentication service
 * Orchestrates all authentication-related services
 */
export class AuthenticationServiceImpl implements AuthenticationService {
  private googleOAuthService: GoogleOAuthService;
  private cognitoService: CognitoIdentityService;
  private tokenHandler: TokenHandler;
  private sessionManager: SessionManager;
  private tokenRefreshManager: TokenRefreshManager;
  private reAuthCallback?: (error: AuthError) => void;

  constructor() {
    // Initialize all services
    this.googleOAuthService = new GoogleOAuthServiceImpl();
    this.cognitoService = new CognitoIdentityServiceImpl();
    this.tokenHandler = new TokenHandlerImpl(this.googleOAuthService, this.cognitoService);
    this.sessionManager = new SessionManagerImpl();

    // Initialize token refresh manager with automatic background refresh
    this.tokenRefreshManager = new TokenRefreshManagerImpl(
      this, // Pass this service for refresh operations
      this.tokenHandler,
      {
        autoStart: false, // We'll start it manually after authentication
        checkIntervalMs: 60 * 1000, // Check every minute
        expirationBufferMs: 5 * 60 * 1000, // Refresh 5 minutes before expiration
        maxRefreshFailures: 3 // Allow 3 consecutive failures before re-auth
      }
    );

    // Set up re-authentication callback
    this.sessionManager.setReAuthenticationCallback((error: AuthError) => {
      if (this.reAuthCallback) {
        this.reAuthCallback(error);
      }
    });

    // Set up token refresh manager callbacks
    this.tokenRefreshManager.onRefreshSuccess(() => {
      console.debug('AuthenticationService: Background token refresh successful');
    });

    this.tokenRefreshManager.onRefreshFailure((error: AuthError) => {
      console.warn('AuthenticationService: Background token refresh failed:', error.message);
    });

    this.tokenRefreshManager.onReAuthenticationRequired((error: AuthError) => {
      console.warn('AuthenticationService: Re-authentication required due to refresh failures');
      if (this.reAuthCallback) {
        this.reAuthCallback(error);
      }
    });
  }

  /**
   * Initiates Google OAuth authentication flow
   * @returns Promise resolving to the OAuth authorization URL
   */
  async initiateGoogleAuth(): Promise<string> {
    try {
      // Generate OAuth URL with PKCE parameters
      const authUrlResult = await this.googleOAuthService.generateAuthUrl();
      
      // Store PKCE parameters for later use in callback
      sessionStorage.setItem('oauth_state', authUrlResult.state);
      sessionStorage.setItem('code_verifier', authUrlResult.codeVerifier);
      sessionStorage.setItem('code_challenge', authUrlResult.codeChallenge);

      return authUrlResult.authUrl;
    } catch (error) {
      throw errorHandler.classifyError(error, 'AuthenticationService.initiateGoogleAuth');
    }
  }

  /**
   * Completes Google OAuth authentication flow
   * @param code Authorization code from OAuth callback
   * @param state State parameter for CSRF validation
   * @returns Promise resolving to authenticated user profile
   */
  async completeGoogleAuth(code: string, state: string): Promise<GoogleUserProfile> {
    try {
      // Validate state parameter (CSRF protection)
      const storedState = sessionStorage.getItem('oauth_state');
      if (!storedState || storedState !== state) {
        throw errorHandler.createError(
          AuthErrorCode.INVALID_STATE,
          'Invalid state parameter - possible CSRF attack',
          { storedState, receivedState: state }
        );
      }

      // Get stored PKCE verifier
      const codeVerifier = sessionStorage.getItem('code_verifier');
      if (!codeVerifier) {
        throw errorHandler.createError(
          AuthErrorCode.GOOGLE_AUTH_FAILED,
          'Missing PKCE code verifier',
          { hasCode: !!code, hasState: !!state }
        );
      }

      // Step 1: Exchange authorization code for Google tokens
      const googleTokens = await this.googleOAuthService.exchangeCodeForTokens(
        code, 
        codeVerifier, 
        state
      );

      // Step 2: Validate Google ID token
      const tokenPayload = await this.googleOAuthService.validateIdToken(googleTokens.idToken);

      // Step 3: Process user data with privacy compliance
      const userProfile = privacyService.processUserDataPrivacyCompliant(tokenPayload);

      // Step 4: Authenticate with Cognito using Google ID token and profile for mapping consistency
      const cognitoCredentials = await this.cognitoService.authenticateWithGoogle(
        googleTokens.idToken, 
        userProfile
      );
      // Step 5: Create authentication tokens object
      const authTokens: AuthTokens = {
        googleIdToken: googleTokens.idToken,
        cognitoCredentials: cognitoCredentials,
        refreshToken: googleTokens.refreshToken,
        expiresAt: new Date(Date.now() + (googleTokens.expiresIn * 1000))
      };

      // Step 6: Store tokens securely
      await this.tokenHandler.storeTokens(authTokens);

      // Step 7: Create user session
      const awsCredentials = new AWS.Credentials({
        accessKeyId: cognitoCredentials.accessKeyId,
        secretAccessKey: cognitoCredentials.secretAccessKey,
        sessionToken: cognitoCredentials.sessionToken
      });

      await this.sessionManager.createSession(
        cognitoCredentials.identityId,
        awsCredentials,
        userProfile,
        authTokens.expiresAt
      );

      // Step 8: Clean up OAuth parameters
      this.cleanupOAuthParameters();

      // Step 9: Start background token refresh monitoring
      this.startBackgroundTokenRefresh();

      return userProfile;
    } catch (error) {
      // Clean up OAuth parameters on error
      this.cleanupOAuthParameters();
      throw errorHandler.classifyError(error, 'AuthenticationService.completeGoogleAuth');
    }
  }

  /**
   * Completes Google authentication using implicit flow tokens from URL fragment.
   * Used when response_type=token id_token is used (no code exchange needed).
   */
  async completeGoogleAuthImplicit(idToken: string, accessToken: string, state: string): Promise<GoogleUserProfile> {
    try {
      // Validate state for CSRF protection
      const storedState = sessionStorage.getItem('oauth_state');
      if (!storedState || storedState !== state) {
        throw errorHandler.createError(
          AuthErrorCode.INVALID_STATE,
          'Invalid state parameter - possible CSRF attack',
          { storedState, receivedState: state }
        );
      }

      // Validate the ID token
      const tokenPayload = await this.googleOAuthService.validateIdToken(idToken);

      // Process user data with privacy compliance
      const userProfile = privacyService.processUserDataPrivacyCompliant(tokenPayload);

      // Authenticate with Cognito using Google ID token
      const cognitoCredentials = await this.cognitoService.authenticateWithGoogle(idToken, userProfile);

      // Store tokens
      const authTokens: AuthTokens = {
        googleIdToken: idToken,
        cognitoCredentials: cognitoCredentials,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour default
      };
      await this.tokenHandler.storeTokens(authTokens);

      // Create session
      const awsCredentials = new AWS.Credentials({
        accessKeyId: cognitoCredentials.accessKeyId,
        secretAccessKey: cognitoCredentials.secretAccessKey,
        sessionToken: cognitoCredentials.sessionToken
      });
      await this.sessionManager.createSession(
        cognitoCredentials.identityId,
        awsCredentials,
        userProfile,
        authTokens.expiresAt
      );

      this.cleanupOAuthParameters();
      this.startBackgroundTokenRefresh();

      return userProfile;
    } catch (error) {
      this.cleanupOAuthParameters();
      throw errorHandler.classifyError(error, 'AuthenticationService.completeGoogleAuthImplicit');
    }
  }

  /**
   * Gets the current authenticated user profile
   * @returns Promise resolving to user profile or null if not authenticated
   */
  async getCurrentUser(): Promise<GoogleUserProfile | null> {
    try {
      return await this.sessionManager.getUserIdentity();
    } catch (error) {
      throw errorHandler.classifyError(error, 'AuthenticationService.getCurrentUser');
    }
  }

  /**
   * Gets AWS credentials for the current authenticated user
   * @returns Promise resolving to AWS credentials or null if not authenticated
   */
  async getAwsCredentials(): Promise<AWS.Credentials | null> {
    try {
      // Ensure session is valid and refresh if needed
      const session = await this.sessionManager.ensureValidSession();
      if (!session) {
        return null;
      }

      return session.awsCredentials;
    } catch (error) {
      throw errorHandler.classifyError(error, 'AuthenticationService.getAwsCredentials');
    }
  }

  /**
   * Gets Cognito identity ID for the current authenticated user
   * @returns Promise resolving to identity ID or null if not authenticated
   */
  async getCognitoIdentityId(): Promise<string | null> {
    try {
      return await this.sessionManager.getCognitoIdentityId();
    } catch (error) {
      throw errorHandler.classifyError(error, 'AuthenticationService.getCognitoIdentityId');
    }
  }

  /**
   * Checks if user is currently authenticated
   * @returns Promise resolving to true if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we have valid tokens
      const hasValidTokens = await this.tokenHandler.hasValidTokens();
      if (!hasValidTokens) {
        return false;
      }

      // Check if session is valid
      const isSessionValid = this.sessionManager.isSessionValid();
      if (!isSessionValid) {
        return false;
      }

      // Ensure session is not expired and refresh if needed
      const session = await this.sessionManager.ensureValidSession();
      return session !== null;
    } catch (error) {
      // If any error occurs during authentication check, consider user not authenticated
      return false;
    }
  }

  /**
   * Refreshes authentication tokens and session
   * @returns Promise that resolves when tokens are refreshed
   */
  async refreshTokens(): Promise<void> {
    try {
      // Refresh tokens using token handler
      const refreshedTokens = await this.tokenHandler.refreshTokenIfNeeded();
      
      // Update session with new credentials
      const currentSession = await this.sessionManager.getCurrentSession();
      if (currentSession) {
        const newAwsCredentials = new AWS.Credentials({
          accessKeyId: refreshedTokens.cognitoCredentials.accessKeyId,
          secretAccessKey: refreshedTokens.cognitoCredentials.secretAccessKey,
          sessionToken: refreshedTokens.cognitoCredentials.sessionToken
        });

        await this.sessionManager.createSession(
          refreshedTokens.cognitoCredentials.identityId,
          newAwsCredentials,
          currentSession.googleProfile,
          refreshedTokens.expiresAt
        );
      }
    } catch (error) {
      throw errorHandler.classifyError(error, 'AuthenticationService.refreshTokens');
    }
  }

  /**
   * Logs out the current user and clears all authentication data
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    try {
      // Stop background token refresh
      this.stopBackgroundTokenRefresh();
      
      // Clear session data
      await this.sessionManager.clearSession();
      
      // Clear stored tokens
      await this.tokenHandler.clearTokens();
      
      // Clean up any remaining OAuth parameters
      this.cleanupOAuthParameters();
      
      // Clear any other authentication-related storage
      sessionStorage.removeItem('oauth_redirect_url');
      
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.warn('Error during logout:', error);
    }
  }

  /**
   * Sets callback for re-authentication required events
   * @param callback Function to call when re-authentication is required
   */
  onReAuthenticationRequired(callback: (error: AuthError) => void): void {
    this.reAuthCallback = callback;
  }

  /**
   * Starts background token refresh monitoring
   * Automatically monitors token expiration and refreshes tokens proactively
   */
  startBackgroundTokenRefresh(): void {
    this.tokenRefreshManager.startBackgroundRefresh();
  }

  /**
   * Stops background token refresh monitoring
   * Disables automatic token refresh monitoring
   */
  stopBackgroundTokenRefresh(): void {
    this.tokenRefreshManager.stopBackgroundRefresh();
  }

  /**
   * Checks if background token refresh is currently active
   * @returns True if background refresh is running, false otherwise
   */
  isBackgroundRefreshActive(): boolean {
    return this.tokenRefreshManager.isBackgroundRefreshActive();
  }

  /**
   * Gets complete authentication state for debugging/monitoring
   * @returns Promise resolving to current authentication state
   */
  async getAuthenticationState(): Promise<{
    isAuthenticated: boolean;
    hasValidTokens: boolean;
    hasValidSession: boolean;
    user: GoogleUserProfile | null;
    cognitoIdentityId: string | null;
    sessionExpiry: Date | null;
    backgroundRefreshActive: boolean;
    refreshManagerStatus: any;
  }> {
    try {
      const [
        isAuthenticated,
        hasValidTokens,
        user,
        cognitoIdentityId,
        session
      ] = await Promise.all([
        this.isAuthenticated(),
        this.tokenHandler.hasValidTokens(),
        this.getCurrentUser(),
        this.getCognitoIdentityId(),
        this.sessionManager.getCurrentSession()
      ]);

      return {
        isAuthenticated,
        hasValidTokens,
        hasValidSession: this.sessionManager.isSessionValid(),
        user,
        cognitoIdentityId,
        sessionExpiry: session?.expiresAt || null,
        backgroundRefreshActive: this.isBackgroundRefreshActive(),
        refreshManagerStatus: this.tokenRefreshManager.getStatus()
      };
    } catch (error) {
      throw errorHandler.classifyError(error, 'AuthenticationService.getAuthenticationState');
    }
  }

  /**
   * Handles automatic token refresh in the background
   * Should be called periodically to maintain authentication
   * @returns Promise that resolves when refresh check is complete
   * @deprecated Use startBackgroundTokenRefresh() for automatic monitoring
   */
  async maintainAuthentication(): Promise<void> {
    try {
      // Delegate to the token refresh manager for consistency
      await this.tokenRefreshManager.checkAndRefreshTokens();
    } catch (error) {
      // If maintenance fails, trigger re-authentication
      if (this.reAuthCallback) {
        const authError: AuthError = {
          code: AuthErrorCode.TOKEN_EXPIRED,
          message: 'Authentication maintenance failed, re-authentication required',
          details: error,
          timestamp: new Date()
        };
        this.reAuthCallback(authError);
      }
    }
  }

  /**
   * Cleans up OAuth-related session storage parameters
   * @private
   */
  private cleanupOAuthParameters(): void {
    try {
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('code_verifier');
      sessionStorage.removeItem('code_challenge');
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup OAuth parameters:', error);
    }
  }
}

// Export singleton instance for easy use throughout the application
export const authenticationService = new AuthenticationServiceImpl();