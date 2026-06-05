// Service exports for easy importing
export { GoogleOAuthServiceImpl } from './GoogleOAuthService';
export { CognitoIdentityServiceImpl } from './CognitoIdentityService';
export { TokenHandlerImpl } from './TokenHandler';
export { SessionManagerImpl } from './SessionManager';
export { ErrorHandlingService, errorHandler } from './ErrorHandlingService';
export { AuthenticationServiceImpl, authenticationService } from './AuthenticationService';

// Re-export types for convenience
export type {
  GoogleOAuthService,
  CognitoIdentityService,
  TokenHandler,
  SessionManager
} from '../types/services';
export type { AuthenticationService } from './AuthenticationService';
