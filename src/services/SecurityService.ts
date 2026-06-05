import { AuthErrorCode } from '../types';
import { errorHandler } from './ErrorHandlingService';
import { securityConfig } from '../config/auth';

/**
 * Security service that handles HTTPS enforcement and CSRF protection
 * Implements OAuth 2.0 security best practices including state parameter validation
 */
export class SecurityService {
  private static instance: SecurityService;
  private storedStates: Map<string, { timestamp: number; redirectUri?: string }> = new Map();
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Enforces HTTPS for all authentication-related requests
   * @param url The URL to validate
   * @throws AuthError if URL is not HTTPS in production
   */
  public enforceHTTPS(url: string): void {
    try {
      const parsedUrl = new URL(url);
      
      // In production or when HTTPS is explicitly required, enforce HTTPS
      if (securityConfig.httpsOnly && parsedUrl.protocol !== 'https:') {
        throw errorHandler.createError(
          AuthErrorCode.NETWORK_ERROR,
          'HTTPS is required for authentication requests',
          { 
            url: url, 
            protocol: parsedUrl.protocol,
            httpsOnly: securityConfig.httpsOnly 
          }
        );
      }

      // Warn in development if not using HTTPS
      if (import.meta.env.DEV && parsedUrl.protocol !== 'https:') {
        console.warn(
          'SecurityService: Using HTTP in development. HTTPS is recommended for authentication.'
        );
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw errorHandler.createError(
          AuthErrorCode.NETWORK_ERROR,
          'Invalid URL provided for HTTPS validation',
          { url: url, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Generates and stores a CSRF state parameter
   * @param redirectUri Optional redirect URI to associate with state
   * @returns Generated state parameter
   */
  public generateCSRFState(redirectUri?: string): string {
    // Generate cryptographically secure random state
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for older browsers
      for (let i = 0; i < 32; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Store state with timestamp for validation
    this.storedStates.set(state, {
      timestamp: Date.now(),
      redirectUri: redirectUri
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    // Store in session storage as backup
    try {
      const stateData = {
        state: state,
        timestamp: Date.now(),
        redirectUri: redirectUri
      };
      sessionStorage.setItem(`${securityConfig.stateStorageKey}_${state}`, JSON.stringify(stateData));
    } catch (error) {
      console.warn('SecurityService: Failed to store state in session storage:', error);
    }

    return state;
  }

  /**
   * Validates a CSRF state parameter
   * @param state The state parameter to validate
   * @param expectedRedirectUri Optional expected redirect URI
   * @returns True if state is valid, throws error if invalid
   */
  public validateCSRFState(state: string, expectedRedirectUri?: string): boolean {
    if (!state || typeof state !== 'string') {
      throw errorHandler.createError(
        AuthErrorCode.INVALID_STATE,
        'State parameter is required and must be a string',
        { state: state, type: typeof state }
      );
    }

    // Check in-memory storage first
    const storedStateData = this.storedStates.get(state);
    let stateData = storedStateData;

    // Fallback to session storage if not found in memory
    if (!stateData) {
      try {
        const sessionData = sessionStorage.getItem(`${securityConfig.stateStorageKey}_${state}`);
        if (sessionData) {
          stateData = JSON.parse(sessionData);
        }
      } catch (error) {
        console.warn('SecurityService: Failed to retrieve state from session storage:', error);
      }
    }

    if (!stateData) {
      throw errorHandler.createError(
        AuthErrorCode.INVALID_STATE,
        'Invalid or expired state parameter',
        { state: state }
      );
    }

    // Check if state has expired
    const now = Date.now();
    if (now - stateData.timestamp > this.STATE_EXPIRY_MS) {
      this.removeState(state);
      throw errorHandler.createError(
        AuthErrorCode.INVALID_STATE,
        'State parameter has expired',
        { 
          state: state, 
          age: now - stateData.timestamp, 
          maxAge: this.STATE_EXPIRY_MS 
        }
      );
    }

    // Validate redirect URI if provided
    if (expectedRedirectUri && stateData.redirectUri && stateData.redirectUri !== expectedRedirectUri) {
      throw errorHandler.createError(
        AuthErrorCode.INVALID_STATE,
        'State parameter redirect URI mismatch',
        { 
          state: state, 
          expected: expectedRedirectUri, 
          actual: stateData.redirectUri 
        }
      );
    }

    // Remove state after successful validation (one-time use)
    this.removeState(state);

    return true;
  }

  /**
   * Creates a secure fetch wrapper that enforces HTTPS and adds CSRF protection
   * @param url The URL to fetch
   * @param options Fetch options
   * @returns Promise resolving to fetch response
   */
  public async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Enforce HTTPS
    this.enforceHTTPS(url);

    // Add security headers
    const secureHeaders: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(options.headers as Record<string, string> || {})
    };

    // Add CSRF token for state-changing requests
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
      const csrfToken = this.generateCSRFToken();
      secureHeaders['X-CSRF-Token'] = csrfToken;
    }

    const secureOptions: RequestInit = {
      ...options,
      headers: secureHeaders,
      credentials: 'same-origin', // Include cookies for same-origin requests
      mode: 'cors' // Enable CORS for cross-origin requests
    };

    try {
      const response = await fetch(url, secureOptions);
      
      // Log security-relevant response headers in development
      if (import.meta.env.DEV) {
        const securityHeaders = [
          'strict-transport-security',
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection',
          'content-security-policy'
        ];
        
        securityHeaders.forEach(header => {
          const value = response.headers.get(header);
          if (value) {
            console.debug(`SecurityService: ${header}: ${value}`);
          }
        });
      }

      return response;
    } catch (error) {
      throw errorHandler.classifyError(error, 'SecurityService.secureFetch');
    }
  }

  /**
   * Validates that the current page is loaded over HTTPS
   * @throws AuthError if page is not HTTPS in production
   */
  public validatePageSecurity(): void {
    if (typeof window === 'undefined') {
      return; // Skip validation in server-side rendering
    }

    const protocol = window.location.protocol;
    
    if (securityConfig.httpsOnly && protocol !== 'https:') {
      throw errorHandler.createError(
        AuthErrorCode.NETWORK_ERROR,
        'Authentication requires HTTPS. Please access the application over HTTPS.',
        { 
          currentProtocol: protocol,
          currentUrl: window.location.href 
        }
      );
    }

    // Warn in development
    if (import.meta.env.DEV && protocol !== 'https:') {
      console.warn(
        'SecurityService: Page loaded over HTTP in development. HTTPS is recommended for authentication.'
      );
    }
  }

  /**
   * Generates a CSRF token for API requests
   * @returns CSRF token string
   */
  private generateCSRFToken(): string {
    const array = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Removes a state parameter from storage
   * @param state The state parameter to remove
   */
  private removeState(state: string): void {
    this.storedStates.delete(state);
    try {
      sessionStorage.removeItem(`${securityConfig.stateStorageKey}_${state}`);
    } catch (error) {
      console.warn('SecurityService: Failed to remove state from session storage:', error);
    }
  }

  /**
   * Cleans up expired state parameters
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];

    this.storedStates.forEach((data, state) => {
      if (now - data.timestamp > this.STATE_EXPIRY_MS) {
        expiredStates.push(state);
      }
    });

    expiredStates.forEach(state => this.removeState(state));
  }

  /**
   * Clears all stored states (useful for logout)
   */
  public clearAllStates(): void {
    this.storedStates.clear();
    
    // Clear from session storage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(securityConfig.stateStorageKey)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('SecurityService: Failed to clear states from session storage:', error);
    }
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();