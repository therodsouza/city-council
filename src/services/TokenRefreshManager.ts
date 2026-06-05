import { AuthenticationService } from './AuthenticationService';
import { TokenHandler, TokenRefreshManager } from '../types/services';
import { AuthError, AuthErrorCode } from '../types';
import { errorHandler } from './ErrorHandlingService';

/**
 * TokenRefreshManager - Handles automatic background token refresh
 * 
 * This service implements automatic token refresh with expiration monitoring
 * to ensure users maintain valid authentication without manual intervention.
 * 
 * Features:
 * - Background token expiration monitoring
 * - Automatic token refresh before expiration
 * - Graceful fallback to re-authentication when refresh fails
 * - Session expiration detection and user prompting
 * - Configurable refresh intervals and expiration buffers
 */

/**
 * Configuration options for token refresh manager
 */
export interface TokenRefreshConfig {
  // How often to check for token expiration (default: 60 seconds)
  checkIntervalMs: number;
  
  // How long before expiration to refresh tokens (default: 5 minutes)
  expirationBufferMs: number;
  
  // Maximum number of consecutive refresh failures before triggering re-auth (default: 3)
  maxRefreshFailures: number;
  
  // Whether to start background refresh automatically (default: true)
  autoStart: boolean;
}

/**
 * Default configuration for token refresh manager
 */
export const DEFAULT_REFRESH_CONFIG: TokenRefreshConfig = {
  checkIntervalMs: 60 * 1000, // Check every minute
  expirationBufferMs: 5 * 60 * 1000, // Refresh 5 minutes before expiration
  maxRefreshFailures: 3, // Allow 3 consecutive failures before re-auth
  autoStart: true
};

/**
 * Implementation of automatic token refresh manager
 */
export class TokenRefreshManagerImpl implements TokenRefreshManager {
  private authService: AuthenticationService;
  private tokenHandler: TokenHandler;
  private config: TokenRefreshConfig;
  
  // Background refresh state
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private isActive: boolean = false;
  private consecutiveFailures: number = 0;
  
  // Event callbacks
  private refreshSuccessCallback?: () => void;
  private refreshFailureCallback?: (error: AuthError) => void;
  private reAuthRequiredCallback?: (error: AuthError) => void;

  constructor(
    authService: AuthenticationService,
    tokenHandler: TokenHandler,
    config: Partial<TokenRefreshConfig> = {}
  ) {
    this.authService = authService;
    this.tokenHandler = tokenHandler;
    this.config = { ...DEFAULT_REFRESH_CONFIG, ...config };
    
    // Auto-start if configured
    if (this.config.autoStart) {
      this.startBackgroundRefresh();
    }
  }

  /**
   * Starts background token refresh monitoring
   * Begins periodic checking of token expiration and automatic refresh
   */
  startBackgroundRefresh(): void {
    if (this.isActive) {
      console.debug('TokenRefreshManager: Background refresh already active');
      return;
    }

    console.debug('TokenRefreshManager: Starting background token refresh monitoring');
    
    this.isActive = true;
    this.consecutiveFailures = 0;
    
    // Set up periodic token checking
    this.refreshIntervalId = setInterval(async () => {
      try {
        await this.performBackgroundRefreshCheck();
      } catch (error) {
        console.warn('TokenRefreshManager: Background refresh check failed:', error);
      }
    }, this.config.checkIntervalMs);
    
    // Perform initial check
    this.performBackgroundRefreshCheck().catch(error => {
      console.warn('TokenRefreshManager: Initial refresh check failed:', error);
    });
  }

  /**
   * Stops background token refresh monitoring
   * Clears the refresh interval and stops automatic checking
   */
  stopBackgroundRefresh(): void {
    if (!this.isActive) {
      console.debug('TokenRefreshManager: Background refresh already inactive');
      return;
    }

    console.debug('TokenRefreshManager: Stopping background token refresh monitoring');
    
    this.isActive = false;
    
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  /**
   * Checks if background refresh is currently active
   * @returns True if background refresh is running, false otherwise
   */
  isBackgroundRefreshActive(): boolean {
    return this.isActive;
  }

  /**
   * Manually checks and refreshes tokens if needed
   * @returns Promise resolving to true if tokens were refreshed, false if not needed
   */
  async checkAndRefreshTokens(): Promise<boolean> {
    try {
      // Check if user is authenticated
      const isAuthenticated = await this.authService.isAuthenticated();
      if (!isAuthenticated) {
        console.debug('TokenRefreshManager: User not authenticated, skipping refresh check');
        return false;
      }

      // Get current tokens
      const tokens = await this.tokenHandler.getStoredTokens();
      if (!tokens) {
        console.debug('TokenRefreshManager: No tokens found, skipping refresh');
        return false;
      }

      // Check if tokens need refresh
      const now = new Date();
      const timeUntilExpiration = tokens.expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiration > this.config.expirationBufferMs) {
        // Tokens are still valid, no refresh needed
        return false;
      }

      console.debug('TokenRefreshManager: Tokens are close to expiration, attempting refresh');
      
      // Attempt token refresh
      await this.authService.refreshTokens();
      
      // Reset failure counter on successful refresh
      this.consecutiveFailures = 0;
      
      // Trigger success callback
      if (this.refreshSuccessCallback) {
        this.refreshSuccessCallback();
      }
      
      console.debug('TokenRefreshManager: Tokens refreshed successfully');
      return true;
      
    } catch (error) {
      return this.handleRefreshFailure(error);
    }
  }

  /**
   * Sets the interval for background token checking
   * @param intervalMs Interval in milliseconds between token checks
   */
  setRefreshInterval(intervalMs: number): void {
    if (intervalMs < 10000) { // Minimum 10 seconds
      throw new Error('Refresh interval must be at least 10 seconds');
    }
    
    this.config.checkIntervalMs = intervalMs;
    
    // Restart background refresh with new interval if active
    if (this.isActive) {
      this.stopBackgroundRefresh();
      this.startBackgroundRefresh();
    }
  }

  /**
   * Sets the expiration buffer for token refresh
   * @param bufferMs Buffer time in milliseconds before expiration to refresh tokens
   */
  setExpirationBuffer(bufferMs: number): void {
    if (bufferMs < 60000) { // Minimum 1 minute
      throw new Error('Expiration buffer must be at least 1 minute');
    }
    
    this.config.expirationBufferMs = bufferMs;
  }

  /**
   * Sets callback for successful token refresh events
   * @param callback Function to call when tokens are successfully refreshed
   */
  onRefreshSuccess(callback: () => void): void {
    this.refreshSuccessCallback = callback;
  }

  /**
   * Sets callback for token refresh failure events
   * @param callback Function to call when token refresh fails
   */
  onRefreshFailure(callback: (error: AuthError) => void): void {
    this.refreshFailureCallback = callback;
  }

  /**
   * Sets callback for re-authentication required events
   * @param callback Function to call when re-authentication is required
   */
  onReAuthenticationRequired(callback: (error: AuthError) => void): void {
    this.reAuthRequiredCallback = callback;
  }

  /**
   * Performs background refresh check
   * Called periodically by the background refresh interval
   * @private
   */
  private async performBackgroundRefreshCheck(): Promise<void> {
    try {
      await this.checkAndRefreshTokens();
    } catch (error) {
      console.warn('TokenRefreshManager: Background refresh check failed:', error);
    }
  }

  /**
   * Handles token refresh failures with graceful fallback
   * @param error The error that occurred during refresh
   * @returns False to indicate refresh failed
   * @private
   */
  private handleRefreshFailure(error: any): boolean {
    this.consecutiveFailures++;
    
    const authError: AuthError = {
      code: AuthErrorCode.TOKEN_EXPIRED,
      message: `Token refresh failed (attempt ${this.consecutiveFailures}/${this.config.maxRefreshFailures})`,
      details: error,
      timestamp: new Date()
    };

    console.warn('TokenRefreshManager: Token refresh failed:', authError.message);
    
    // Trigger failure callback
    if (this.refreshFailureCallback) {
      this.refreshFailureCallback(authError);
    }

    // Check if we've exceeded maximum failures
    if (this.consecutiveFailures >= this.config.maxRefreshFailures) {
      this.triggerReAuthentication(authError);
    }

    return false;
  }

  /**
   * Triggers re-authentication when refresh failures exceed threshold
   * @param lastError The last error that occurred
   * @private
   */
  private triggerReAuthentication(lastError: AuthError): void {
    console.warn('TokenRefreshManager: Maximum refresh failures exceeded, triggering re-authentication');
    
    // Stop background refresh to prevent further attempts
    this.stopBackgroundRefresh();
    
    const reAuthError: AuthError = {
      code: AuthErrorCode.TOKEN_EXPIRED,
      message: `Re-authentication required: Token refresh failed ${this.config.maxRefreshFailures} consecutive times`,
      details: {
        lastError,
        consecutiveFailures: this.consecutiveFailures,
        maxFailures: this.config.maxRefreshFailures
      },
      timestamp: new Date()
    };

    // Trigger re-authentication callback
    if (this.reAuthRequiredCallback) {
      this.reAuthRequiredCallback(reAuthError);
    }
  }

  /**
   * Gets current refresh manager status for debugging
   * @returns Current status information
   */
  getStatus(): {
    isActive: boolean;
    consecutiveFailures: number;
    maxFailures: number;
    checkInterval: number;
    expirationBuffer: number;
    nextCheckIn?: number;
  } {
    let nextCheckIn: number | undefined;
    
    if (this.isActive && this.refreshIntervalId) {
      // Estimate time until next check (approximate)
      nextCheckIn = this.config.checkIntervalMs;
    }

    return {
      isActive: this.isActive,
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.config.maxRefreshFailures,
      checkInterval: this.config.checkIntervalMs,
      expirationBuffer: this.config.expirationBufferMs,
      nextCheckIn
    };
  }

  /**
   * Cleanup method to be called when the manager is no longer needed
   * Stops background refresh and clears all callbacks
   */
  cleanup(): void {
    this.stopBackgroundRefresh();
    this.refreshSuccessCallback = undefined;
    this.refreshFailureCallback = undefined;
    this.reAuthRequiredCallback = undefined;
  }
}