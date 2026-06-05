import CryptoJS from 'crypto-js';

/**
 * Generates a cryptographically secure random string for PKCE code verifier
 * @param length The length of the code verifier (43-128 characters)
 * @returns Base64URL encoded random string
 */
export const generateCodeVerifier = (length: number = 128): string => {
  const array = new Uint8Array(length);
  
  // Use crypto.getRandomValues if available (modern browsers)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers or Node.js environments
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return base64URLEncode(array);
};

/**
 * Generates PKCE code challenge from code verifier using SHA256
 * @param codeVerifier The code verifier string
 * @returns Base64URL encoded SHA256 hash of the code verifier
 */
export const generateCodeChallenge = (codeVerifier: string): string => {
  const hash = CryptoJS.SHA256(codeVerifier);
  return base64URLEncode(CryptoJS.enc.Base64.stringify(hash));
};

/**
 * Generates a random state parameter for OAuth flow
 * @returns Random state string
 */
export const generateState = (): string => {
  return generateCodeVerifier(32);
};

/**
 * Converts a string or Uint8Array to Base64URL encoding
 * @param input String or Uint8Array to encode
 * @returns Base64URL encoded string
 */
const base64URLEncode = (input: string | Uint8Array): string => {
  let base64: string;
  
  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    // Convert Uint8Array to string
    const binaryString = Array.from(input, byte => String.fromCharCode(byte)).join('');
    base64 = btoa(binaryString);
  }
  
  // Convert to Base64URL by replacing characters and removing padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Validates that a string is a valid Base64URL encoded value
 * @param value The string to validate
 * @returns True if valid Base64URL, false otherwise
 */
export const isValidBase64URL = (value: string): boolean => {
  const base64URLPattern = /^[A-Za-z0-9_-]+$/;
  return base64URLPattern.test(value);
};