/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_COGNITO_IDENTITY_POOL_ID?: string;
  readonly VITE_COGNITO_REGION?: string;
  readonly VITE_REDIRECT_URI?: string;
  readonly VITE_OAUTH_SCOPES?: string;
  readonly VITE_PKCE_ENABLED?: string;
  readonly VITE_HTTPS_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
