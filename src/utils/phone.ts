/**
 * Light client-side check that a string looks like a Brazilian mobile number:
 * area code (DDD) plus `9` and 8 digits, optionally prefixed with +55 / 55.
 * It only gates the "send code" button; the API is the authority and rejects
 * anything it does not accept.
 */
export function looksLikeBrazilianMobile(input: string): boolean {
  let digits = input.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  return digits.length === 11 && digits[2] === '9';
}
