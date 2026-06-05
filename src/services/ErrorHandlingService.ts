import { AuthError, AuthErrorCode, RecoveryAction, ErrorDisplayStrategy } from '../types';

/**
 * Centralized Error Handling Service
 * 
 * Provides comprehensive error handling capabilities including:
 * - Error classification and categorization
 * - User-friendly message mapping
 * - Error logging with sanitized details for debugging
 * - Recovery action suggestions for different error types
 * - Consistent error reporting across the application
 */
export class ErrorHandlingService implements ErrorDisplayStrategy {
  private static instance: ErrorHandlingService;
  private errorLog: AuthError[] = [];
  private readonly maxLogSize = 100;

  private constructor() {}

  /**
   * Gets singleton instance of ErrorHandlingService
   */
  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Creates a standardized AuthError with proper classification
   * @param code Error code for classification
   * @param message Technical error message
   * @param details Optional error details for debugging
   * @param originalError Original error object if available
   * @returns Standardized AuthError object
   */
  public createError(
    code: AuthErrorCode,
    message: string,
    details?: any,
    originalError?: Error | unknown
  ): AuthError {
    const error: AuthError = {
      code,
      message,
      details: this.sanitizeErrorDetails(details),
      timestamp: new Date()
    };

    // Log the error with sanitized details
    this.logError(error, originalError);

    return error;
  }

  /**
   * Classifies an unknown error into appropriate AuthError
   * @param error Unknown error object
   * @param context Context where the error occurred
   * @returns Classified AuthError
   */
  public classifyError(error: unknown, context: string = 'unknown'): AuthError {
    // Handle network errors
    if (this.isNetworkError(error)) {
      return this.createError(
        AuthErrorCode.NETWORK_ERROR,
        'Network connectivity issue detected',
        { context, originalMessage: this.extractErrorMessage(error) },
        error as Error
      );
    }

    // Handle Google OAuth specific errors
    if (this.isGoogleOAuthError(error)) {
      const errorMessage = this.extractErrorMessage(error);
      
      if (errorMessage.includes('access_denied') || errorMessage.includes('cancelled')) {
        return this.createError(
          AuthErrorCode.USER_CANCELLED,
          'Authentication was cancelled by user',
          { context, originalMessage: errorMessage },
          error as Error
        );
      }

      return this.createError(
        AuthErrorCode.GOOGLE_AUTH_FAILED,
        'Google authentication failed',
        { context, originalMessage: errorMessage },
        error as Error
      );
    }

    // Handle Cognito specific errors
    if (this.isCognitoError(error)) {
      return this.createError(
        AuthErrorCode.COGNITO_AUTH_FAILED,
        'AWS Cognito authentication failed',
        { context, originalMessage: this.extractErrorMessage(error) },
        error as Error
      );
    }

    // Handle token expiration
    if (this.isTokenExpirationError(error)) {
      return this.createError(
        AuthErrorCode.TOKEN_EXPIRED,
        'Authentication token has expired',
        { context, originalMessage: this.extractErrorMessage(error) },
        error as Error
      );
    }

    // Handle state validation errors (CSRF protection)
    if (this.isStateValidationError(error)) {
      return this.createError(
        AuthErrorCode.INVALID_STATE,
        'Invalid authentication state detected',
        { context, originalMessage: this.extractErrorMessage(error) },
        error as Error
      );
    }

    // Default classification for unknown errors
    return this.createError(
      AuthErrorCode.GOOGLE_AUTH_FAILED,
      'An unexpected error occurred during authentication',
      { context, originalMessage: this.extractErrorMessage(error) },
      error as Error
    );
  }

  /**
   * Provides user-friendly error messages
   * @param error AuthError to get message for
   * @returns User-friendly error message
   */
  public showUserFriendlyMessage(error: AuthError): string {
    const messageMap: Record<AuthErrorCode, string> = {
      [AuthErrorCode.NETWORK_ERROR]: 
        'Unable to connect to authentication services. Please check your internet connection and try again.',
      
      [AuthErrorCode.GOOGLE_AUTH_FAILED]: 
        'Google authentication failed. Please try signing in again or contact support if the problem persists.',
      
      [AuthErrorCode.COGNITO_AUTH_FAILED]: 
        'Authentication service is temporarily unavailable. Please try again in a few moments.',
      
      [AuthErrorCode.TOKEN_EXPIRED]: 
        'Your session has expired. Please sign in again to continue.',
      
      [AuthErrorCode.USER_CANCELLED]: 
        'Sign-in was cancelled. Click "Sign in with Google" to try again.',
      
      [AuthErrorCode.INVALID_STATE]: 
        'Authentication security check failed. Please try signing in again.'
    };

    return messageMap[error.code as AuthErrorCode] || 
           'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  /**
   * Determines if retry option should be shown for an error
   * @param error AuthError to check
   * @returns True if retry option should be shown
   */
  public shouldShowRetryOption(error: AuthError): boolean {
    const retryableErrors = [
      AuthErrorCode.NETWORK_ERROR,
      AuthErrorCode.GOOGLE_AUTH_FAILED,
      AuthErrorCode.COGNITO_AUTH_FAILED,
      AuthErrorCode.TOKEN_EXPIRED,
      AuthErrorCode.INVALID_STATE,
      AuthErrorCode.USER_CANCELLED
    ];

    return retryableErrors.includes(error.code as AuthErrorCode);
  }

  /**
   * Gets recovery actions for different error types
   * @param error AuthError to get recovery actions for
   * @returns Array of recovery actions
   */
  public getRecoveryActions(error: AuthError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.code) {
      case AuthErrorCode.NETWORK_ERROR:
        actions.push(
          {
            label: 'Check Connection',
            action: async () => {
              // Attempt to ping a reliable endpoint
              try {
                await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
                alert('Connection appears to be working. Please try signing in again.');
              } catch {
                alert('Connection issue detected. Please check your internet connection.');
              }
            },
            isPrimary: false
          },
          {
            label: 'Retry Sign In',
            action: async () => window.location.reload(),
            isPrimary: true
          }
        );
        break;

      case AuthErrorCode.GOOGLE_AUTH_FAILED:
        actions.push(
          {
            label: 'Try Again',
            action: async () => window.location.reload(),
            isPrimary: true
          },
          {
            label: 'Clear Browser Data',
            action: async () => {
              sessionStorage.clear();
              localStorage.removeItem('auth_session');
              alert('Browser data cleared. Please try signing in again.');
              window.location.reload();
            },
            isPrimary: false
          }
        );
        break;

      case AuthErrorCode.COGNITO_AUTH_FAILED:
        actions.push(
          {
            label: 'Retry',
            action: async () => window.location.reload(),
            isPrimary: true
          },
          {
            label: 'Wait and Retry',
            action: async () => {
              alert('Waiting 30 seconds before retry...');
              setTimeout(() => window.location.reload(), 30000);
            },
            isPrimary: false
          }
        );
        break;

      case AuthErrorCode.TOKEN_EXPIRED:
        actions.push(
          {
            label: 'Sign In Again',
            action: async () => {
              sessionStorage.clear();
              localStorage.removeItem('auth_session');
              window.location.reload();
            },
            isPrimary: true
          }
        );
        break;

      case AuthErrorCode.USER_CANCELLED:
        actions.push(
          {
            label: 'Try Again',
            action: async () => window.location.reload(),
            isPrimary: true
          }
        );
        break;

      case AuthErrorCode.INVALID_STATE:
        actions.push(
          {
            label: 'Start Fresh',
            action: async () => {
              sessionStorage.clear();
              window.location.reload();
            },
            isPrimary: true
          }
        );
        break;

      default:
        actions.push(
          {
            label: 'Retry',
            action: async () => window.location.reload(),
            isPrimary: true
          }
        );
    }

    return actions;
  }

  /**
   * Logs error with sanitized details for debugging
   * @param error AuthError to log
   * @param originalError Original error object if available
   */
  private logError(error: AuthError, originalError?: Error | unknown): void {
    // Add to in-memory log
    this.errorLog.push(error);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging for development (sanitized)
    if (import.meta.env.DEV) {
      console.group(`🔴 Auth Error [${error.code}]`);
      console.log('Message:', error.message);
      console.log('Timestamp:', error.timestamp.toISOString());
      console.log('Sanitized Details:', error.details);
      if (originalError) {
        console.log('Original Error:', originalError);
      }
      console.groupEnd();
    }

    // In production, you would send this to your logging service
    // Example: this.sendToLoggingService(error);
  }

  /**
   * Sanitizes error details to remove sensitive information
   * @param details Raw error details
   * @returns Sanitized error details
   */
  private sanitizeErrorDetails(details: any): any {
    if (!details) return details;

    // Create a deep copy to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(details));

    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'access_token', 'refresh_token', 'id_token',
      'client_secret', 'authorization', 'cookie', 'session'
    ];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Extracts error message from various error types
   * @param error Error object
   * @returns Error message string
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return 'Unknown error';
  }

  /**
   * Checks if error is a network-related error
   */
  private isNetworkError(error: unknown): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('connection') ||
           message.includes('timeout') ||
           message.includes('cors') ||
           (error instanceof TypeError && message.includes('failed to fetch'));
  }

  /**
   * Checks if error is Google OAuth related
   */
  private isGoogleOAuthError(error: unknown): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('oauth') || 
           message.includes('google') || 
           message.includes('access_denied') ||
           message.includes('invalid_grant') ||
           message.includes('token exchange');
  }

  /**
   * Checks if error is Cognito related
   */
  private isCognitoError(error: unknown): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('cognito') || 
           message.includes('identity') || 
           message.includes('credentials') ||
           message.includes('aws');
  }

  /**
   * Checks if error is token expiration related
   */
  private isTokenExpirationError(error: unknown): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('expired') || 
           message.includes('expiration') || 
           message.includes('invalid_token');
  }

  /**
   * Checks if error is state validation related
   */
  private isStateValidationError(error: unknown): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('state') || 
           message.includes('csrf') || 
           message.includes('invalid state');
  }

  /**
   * Gets recent error log entries
   * @param limit Maximum number of entries to return
   * @returns Array of recent errors
   */
  public getRecentErrors(limit: number = 10): AuthError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clears the error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Gets error statistics for monitoring
   * @returns Error statistics object
   */
  public getErrorStatistics(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    this.errorLog.forEach(error => {
      stats[error.code] = (stats[error.code] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance for easy access
export const errorHandler = ErrorHandlingService.getInstance();