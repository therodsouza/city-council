/**
 * Light client-side check that a string looks like an email address. It only
 * gates the "send code" button; the API is the authority.
 */
export function looksLikeEmail(input: string): boolean {
  const value = input.trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
