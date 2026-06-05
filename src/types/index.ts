// Core Authentication Types
import type AWS from 'aws-sdk';

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  locale?: string;
}

export interface CognitoCredentials {
  identityId: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

export interface AuthTokens {
  googleIdToken: string;
  cognitoCredentials: CognitoCredentials;
  refreshToken?: string;
  expiresAt: Date;
}

export interface UserSession {
  cognitoIdentityId: string;
  awsCredentials: AWS.Credentials;
  googleProfile: GoogleUserProfile;
  expiresAt: Date;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GoogleUserProfile | null;
  cognitoIdentityId: string | null;
  awsCredentials: CognitoCredentials | null;
  error: AuthError | null;
  lastAuthTime: Date | null;
}

// Error Types

export interface AuthError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export enum AuthErrorCode {
  GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',
  COGNITO_AUTH_FAILED = 'COGNITO_AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_STATE = 'INVALID_STATE',
  USER_CANCELLED = 'USER_CANCELLED'
}

// Configuration Types

export interface AuthConfig {
  googleClientId: string;
  cognitoIdentityPoolId: string;
  cognitoRegion: string;
  redirectUri: string;
  scopes: string[];
  pkceEnabled: boolean;
}

// Google OAuth Types

export interface AuthUrlResult {
  authUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface GoogleTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface GoogleTokenPayload {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat: number;
  exp: number;
}

export interface GoogleAuthResult {
  tokens: GoogleTokens;
  profile: GoogleUserProfile;
}

export interface GoogleAuthError extends AuthError {
  code: AuthErrorCode;
}

// Recovery Actions

export interface RecoveryAction {
  label: string;
  action: () => Promise<void>;
  isPrimary: boolean;
}

export interface ErrorDisplayStrategy {
  showUserFriendlyMessage(error: AuthError): string;
  shouldShowRetryOption(error: AuthError): boolean;
  getRecoveryActions(error: AuthError): RecoveryAction[];
}

