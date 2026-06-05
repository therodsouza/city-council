import { AuthConfig } from '../types';

const env = import.meta.env;

const placeholders = new Set([
  'your_google_client_id_here',
  'your_cognito_identity_pool_id_here',
]);

const isPlaceholder = (value: string | undefined): boolean =>
  !value || placeholders.has(value);

const missingEnvVars: string[] = [];
if (isPlaceholder(env.VITE_GOOGLE_CLIENT_ID)) missingEnvVars.push('VITE_GOOGLE_CLIENT_ID');
if (isPlaceholder(env.VITE_COGNITO_IDENTITY_POOL_ID)) missingEnvVars.push('VITE_COGNITO_IDENTITY_POOL_ID');
if (!env.VITE_COGNITO_REGION) missingEnvVars.push('VITE_COGNITO_REGION');

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing or placeholder environment variables: ${missingEnvVars.join(', ')}. ` +
    'Please configure these in your .env file for the application to work properly.'
  );
}

export const authConfig: AuthConfig = {
  googleClientId: env.VITE_GOOGLE_CLIENT_ID || '',
  cognitoIdentityPoolId: env.VITE_COGNITO_IDENTITY_POOL_ID || '',
  cognitoRegion: env.VITE_COGNITO_REGION || 'us-east-1',
  redirectUri: env.VITE_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  scopes: (env.VITE_OAUTH_SCOPES || 'openid,email,profile').split(','),
  pkceEnabled: env.VITE_PKCE_ENABLED !== 'false'
};

export const securityConfig = {
  httpsOnly: env.VITE_HTTPS_ONLY === 'true',
  tokenStorageKey: 'cognito_auth_tokens',
  sessionStorageKey: 'cognito_session',
  stateStorageKey: 'oauth_state',
  pkceStorageKey: 'pkce_verifier'
};

export const validateConfig = (): boolean => {
  return missingEnvVars.length === 0 &&
         authConfig.googleClientId.length > 0 &&
         authConfig.cognitoIdentityPoolId.length > 0;
};

export const isDevelopment = import.meta.env.DEV;
