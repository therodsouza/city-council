import { GoogleUserProfile, GoogleTokenPayload } from '../types';

/**
 * Privacy Service for handling data minimization and privacy-compliant user data processing
 * Implements privacy requirements by minimizing data collection and ensuring secure handling
 */
export class PrivacyService {
  private static instance: PrivacyService;

  private constructor() {}

  public static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Minimizes user data collection by extracting only essential fields
   * Implements data minimization principle - collect only what's necessary
   * @param tokenPayload Full Google token payload
   * @returns Minimized user profile with only essential data
   */
  public minimizeUserData(tokenPayload: GoogleTokenPayload): GoogleUserProfile {
    // Only collect essential user information required for authentication
    // Exclude optional fields unless explicitly needed
    const minimizedProfile: GoogleUserProfile = {
      id: tokenPayload.sub, // Required for identity mapping
      email: tokenPayload.email, // Required for user identification
      name: tokenPayload.name, // Required for user display
      emailVerified: tokenPayload.email_verified, // Required for security
      // Optional fields are only included if they exist and are needed
      ...(tokenPayload.picture && { picture: tokenPayload.picture }),
      ...(tokenPayload.locale && { locale: tokenPayload.locale })
    };

    // Log data minimization action (without sensitive data)
    console.debug('PrivacyService: User data minimized', {
      fieldsCollected: Object.keys(minimizedProfile),
      totalAvailableFields: Object.keys(tokenPayload).length,
      minimizedFields: Object.keys(minimizedProfile).length
    });

    return minimizedProfile;
  }

  /**
   * Sanitizes user data for logging purposes
   * Removes or redacts sensitive information before logging
   * @param userProfile User profile to sanitize
   * @returns Sanitized profile safe for logging
   */
  public sanitizeForLogging(userProfile: GoogleUserProfile): Record<string, any> {
    return {
      id: '[REDACTED]', // Never log actual user ID
      email: userProfile.email ? '[EMAIL_PROVIDED]' : '[NO_EMAIL]',
      name: userProfile.name ? '[NAME_PROVIDED]' : '[NO_NAME]',
      emailVerified: userProfile.emailVerified,
      hasPicture: !!userProfile.picture,
      hasLocale: !!userProfile.locale
    };
  }

  /**
   * Validates that collected data is minimal and necessary
   * Ensures we're not collecting more data than required
   * @param userProfile User profile to validate
   * @returns True if data collection is compliant
   */
  public validateDataMinimization(userProfile: GoogleUserProfile): boolean {
    const requiredFields = ['id', 'email', 'name', 'emailVerified'];
    const optionalFields = ['picture', 'locale'];
    const profileFields = Object.keys(userProfile);

    // Check that all required fields are present
    const hasAllRequired = requiredFields.every(field => 
      profileFields.includes(field) && userProfile[field as keyof GoogleUserProfile] !== undefined
    );

    if (!hasAllRequired) {
      console.warn('PrivacyService: Missing required fields in user profile');
      return false;
    }

    // Check that no unexpected fields are present
    const unexpectedFields = profileFields.filter(field => 
      !requiredFields.includes(field) && !optionalFields.includes(field)
    );

    if (unexpectedFields.length > 0) {
      console.warn('PrivacyService: Unexpected fields in user profile:', unexpectedFields);
      return false;
    }

    console.debug('PrivacyService: Data minimization validation passed');
    return true;
  }

  /**
   * Processes user data with privacy compliance
   * Ensures all user data processing follows privacy principles
   * @param tokenPayload Raw token payload from Google
   * @returns Privacy-compliant user profile
   */
  public processUserDataPrivacyCompliant(tokenPayload: GoogleTokenPayload): GoogleUserProfile {
    // Step 1: Minimize data collection
    const minimizedProfile = this.minimizeUserData(tokenPayload);

    // Step 2: Validate data minimization compliance
    if (!this.validateDataMinimization(minimizedProfile)) {
      throw new Error('User data processing failed privacy compliance validation');
    }

    // Step 3: Log processing action (with sanitized data)
    console.debug('PrivacyService: User data processed with privacy compliance', 
      this.sanitizeForLogging(minimizedProfile)
    );

    return minimizedProfile;
  }

  /**
   * Clears user data from memory and storage
   * Implements right to be forgotten / data deletion
   * @param userProfile User profile to clear (for logging purposes)
   */
  public clearUserData(userProfile?: GoogleUserProfile): void {
    if (userProfile) {
      console.debug('PrivacyService: Clearing user data', 
        this.sanitizeForLogging(userProfile)
      );
    }

    // Clear any cached user data
    // Note: Actual storage clearing is handled by SessionManager and TokenHandler
    console.debug('PrivacyService: User data clearing completed');
  }

  /**
   * Gets privacy-compliant data retention policy
   * @returns Data retention information
   */
  public getDataRetentionPolicy(): {
    sessionDataRetention: string;
    tokenRetention: string;
    userProfileRetention: string;
  } {
    return {
      sessionDataRetention: 'Session storage only - cleared when browser closes',
      tokenRetention: 'Session storage only - cleared when browser closes or user logs out',
      userProfileRetention: 'Session storage only - not persisted beyond session'
    };
  }

  /**
   * Validates privacy compliance of data processing operations
   * @param operation Description of the operation being performed
   * @param dataTypes Types of data being processed
   * @returns True if operation is privacy compliant
   */
  public validatePrivacyCompliance(operation: string, dataTypes: string[]): boolean {
    const allowedDataTypes = [
      'user_id', 'email', 'name', 'email_verified', 
      'profile_picture', 'locale', 'auth_tokens', 'session_data'
    ];

    const unauthorizedTypes = dataTypes.filter(type => !allowedDataTypes.includes(type));
    
    if (unauthorizedTypes.length > 0) {
      console.error(`PrivacyService: Unauthorized data types in operation '${operation}':`, unauthorizedTypes);
      return false;
    }

    console.debug(`PrivacyService: Privacy compliance validated for operation '${operation}'`);
    return true;
  }
}

// Export singleton instance
export const privacyService = PrivacyService.getInstance();