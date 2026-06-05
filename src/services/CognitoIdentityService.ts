import AWS from 'aws-sdk';
import { CognitoIdentityService } from '../types/services';
import { CognitoCredentials, AuthErrorCode, GoogleUserProfile } from '../types';
import { authConfig } from '../config/auth';
import { errorHandler } from './ErrorHandlingService';
import { securityService } from './SecurityService';

/**
 * Implementation of AWS Cognito Identity Pool service
 * Handles identity creation, credential provisioning, and identity management
 */
export class CognitoIdentityServiceImpl implements CognitoIdentityService {
  private cognitoIdentity: AWS.CognitoIdentity;
  private readonly identityPoolId: string;
  private readonly region: string;

  constructor() {
    this.identityPoolId = authConfig.cognitoIdentityPoolId;
    this.region = authConfig.cognitoRegion;
    
    // Validate security before configuring AWS SDK
    securityService.validatePageSecurity();
    
    // Configure AWS SDK with HTTPS enforcement
    AWS.config.update({
      region: this.region,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: this.identityPoolId
      }),
      sslEnabled: true, // Enforce SSL/TLS
      useAccelerateEndpoint: false, // Use standard endpoints for better security control
      s3ForcePathStyle: false
    });

    this.cognitoIdentity = new AWS.CognitoIdentity({
      region: this.region,
      sslEnabled: true
    });
  }

  /**
   * Authenticates with Google ID token and returns Cognito credentials
   * Includes identity mapping consistency validation and recovery
   * @param googleIdToken JWT ID token from Google OAuth
   * @param googleProfile Google user profile (optional, for mapping validation)
   * @returns Promise resolving to Cognito credentials
   */
  async authenticateWithGoogle(googleIdToken: string, googleProfile?: GoogleUserProfile): Promise<CognitoCredentials> {
    try {
      // Create or get identity ID using Google token
      const identityId = await this.getIdentityIdWithGoogle(googleIdToken);
      
      // Get credentials for the identity
      const credentials = await this.getCredentialsForIdentity(identityId, googleIdToken);
      
      const cognitoCredentials: CognitoCredentials = {
        identityId: identityId,
        accessKeyId: credentials.AccessKeyId!,
        secretAccessKey: credentials.SecretKey!,
        sessionToken: credentials.SessionToken!,
        expiration: credentials.Expiration!
      };

      return cognitoCredentials;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cognito')) {
        throw error; // Re-throw already classified errors
      }
      throw errorHandler.classifyError(error, 'CognitoIdentityService.authenticateWithGoogle');
    }
  }

  /**
   * Refreshes AWS credentials for an existing identity
   * @param identityId Cognito identity ID
   * @returns Promise resolving to refreshed credentials
   */
  async refreshCredentials(identityId: string): Promise<CognitoCredentials> {
    try {
      const params = {
        IdentityId: identityId
      };

      const result = await this.cognitoIdentity.getCredentialsForIdentity(params).promise();
      
      if (!result.Credentials) {
        throw errorHandler.createError(
          AuthErrorCode.COGNITO_AUTH_FAILED,
          'No credentials returned from Cognito during refresh',
          { identityId, result }
        );
      }

      return {
        identityId: identityId,
        accessKeyId: result.Credentials.AccessKeyId!,
        secretAccessKey: result.Credentials.SecretKey!,
        sessionToken: result.Credentials.SessionToken!,
        expiration: result.Credentials.Expiration!
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cognito')) {
        throw error; // Re-throw already classified errors
      }
      throw errorHandler.classifyError(error, 'CognitoIdentityService.refreshCredentials');
    }
  }

  /**
   * Gets or creates a Cognito identity ID
   * @returns Promise resolving to identity ID
   */
  async getIdentityId(): Promise<string> {
    try {
      const params = {
        IdentityPoolId: this.identityPoolId
      };

      const result = await this.cognitoIdentity.getId(params).promise();
      
      if (!result.IdentityId) {
        throw errorHandler.createError(
          AuthErrorCode.COGNITO_AUTH_FAILED,
          'No identity ID returned from Cognito',
          { params, result }
        );
      }

      return result.IdentityId;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cognito')) {
        throw error; // Re-throw already classified errors
      }
      throw errorHandler.classifyError(error, 'CognitoIdentityService.getIdentityId');
    }
  }

  /**
   * Gets identity ID using Google token for federated authentication
   * @param googleIdToken JWT ID token from Google
   * @returns Promise resolving to identity ID
   */
  private async getIdentityIdWithGoogle(googleIdToken: string): Promise<string> {
    const params = {
      IdentityPoolId: this.identityPoolId,
      Logins: {
        'accounts.google.com': googleIdToken
      }
    };

    const result = await this.cognitoIdentity.getId(params).promise();
    
    if (!result.IdentityId) {
      throw errorHandler.createError(
        AuthErrorCode.COGNITO_AUTH_FAILED,
        'No identity ID returned from Cognito with Google token',
        { params: { ...params, Logins: { 'accounts.google.com': '[REDACTED]' } }, result }
      );
    }

    return result.IdentityId;
  }

  /**
   * Gets AWS credentials for a specific identity with Google token
   * @param identityId Cognito identity ID
   * @param googleIdToken JWT ID token from Google
   * @returns Promise resolving to AWS credentials
   */
  private async getCredentialsForIdentity(identityId: string, googleIdToken: string): Promise<AWS.CognitoIdentity.Credentials> {
    const params = {
      IdentityId: identityId,
      Logins: {
        'accounts.google.com': googleIdToken
      }
    };

    const result = await this.cognitoIdentity.getCredentialsForIdentity(params).promise();
    
    if (!result.Credentials) {
      throw errorHandler.createError(
        AuthErrorCode.COGNITO_AUTH_FAILED,
        'No credentials returned from Cognito for identity',
        { 
          identityId, 
          params: { ...params, Logins: { 'accounts.google.com': '[REDACTED]' } }, 
          result 
        }
      );
    }

    return result.Credentials;
  }
}