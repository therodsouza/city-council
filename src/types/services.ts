import AWS from 'aws-sdk';
import { 
  GoogleTokens, 
  GoogleTokenPayload, 
  AuthUrlResult, 
  CognitoCredentials,
  AuthTokens, 
  UserSession, 
  AuthError,
  GoogleUserProfile
} from './index';

// Google OAuth Service Interface
export interface GoogleOAuthService {
  generateAuthUrl(redirectUri?: string): Promise<AuthUrlResult>;
  exchangeCodeForTokens(code: string, codeVerifier: string, state?: string): Promise<GoogleTokens>;
  validateIdToken(idToken: string): Promise<GoogleTokenPayload>;
}

// Cognito Identity Service Interface
export interface CognitoIdentityService {
  authenticateWithGoogle(googleIdToken: string, googleProfile?: GoogleUserProfile): Promise<CognitoCredentials>;
  refreshCredentials(identityId: string): Promise<CognitoCredentials>;
  getIdentityId(): Promise<string>;
}

// Token Handler Service Interface
export interface TokenHandler {
  storeTokens(tokens: AuthTokens): Promise<void>;
  getStoredTokens(): Promise<AuthTokens | null>;
  clearTokens(): Promise<void>;
  isTokenValid(token: string): boolean;
  refreshTokenIfNeeded(): Promise<AuthTokens>;
  hasValidTokens(): Promise<boolean>;
}

// Session Manager Service Interface
export interface SessionManager {
  getCurrentSession(): Promise<UserSession | null>;
  refreshSession(): Promise<UserSession>;
  clearSession(): Promise<void>;
  isSessionValid(): boolean;
  getUserIdentity(): Promise<GoogleUserProfile | null>;
  getAwsCredentials(): Promise<AWS.Credentials | null>;
  getCognitoIdentityId(): Promise<string | null>;
  ensureValidSession(): Promise<UserSession | null>;
  createSession(
    cognitoIdentityId: string,
    awsCredentials: AWS.Credentials,
    googleProfile: GoogleUserProfile,
    expiresAt: Date
  ): Promise<UserSession>;
  setReAuthenticationCallback(callback: (error: AuthError) => void): void;
}

// Token Refresh Manager Service Interface
export interface TokenRefreshManager {
  // Lifecycle management
  startBackgroundRefresh(): void;
  stopBackgroundRefresh(): void;
  isBackgroundRefreshActive(): boolean;
  
  // Manual refresh operations
  checkAndRefreshTokens(): Promise<boolean>;
  
  // Configuration
  setRefreshInterval(intervalMs: number): void;
  setExpirationBuffer(bufferMs: number): void;
  
  // Event handling
  onRefreshSuccess(callback: () => void): void;
  onRefreshFailure(callback: (error: AuthError) => void): void;
  onReAuthenticationRequired(callback: (error: AuthError) => void): void;
  
  // Status and cleanup
  getStatus(): any;
  cleanup(): void;
}

// Component Props Interfaces

export interface LoginScreenProps {
  onAuthSuccess: (credentials: CognitoCredentials) => void;
  onAuthError: (error: AuthError) => void;
  redirectUrl?: string;
}

export interface LoginScreenState {
  isLoading: boolean;
  error: string | null;
  authInProgress: boolean;
}

export interface GoogleAuthButtonProps {
  onAuthStart: () => void;
  onAuthComplete: (result: GoogleUserProfile) => void;
  onAuthError: (error: AuthError) => void;
  disabled?: boolean;
}