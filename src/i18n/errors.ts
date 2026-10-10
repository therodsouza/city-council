import type { TFunction } from 'i18next';
import { ApiError } from '../services/ApiError';

/**
 * Maps failures of the public verification / anonymous-submission endpoints to
 * translated messages. The API's own `message` is English and, for 413/500, not
 * guaranteed to exist, so the UI branches on status (and, for the two 400s that
 * share a status, on the documented message prefix) instead of showing it.
 */

export function sendCodeErrorMessage(e: unknown, t: TFunction): string {
  if (e instanceof ApiError) {
    if (e.status === 400) {
      return /captcha/i.test(e.message) ? t('anon.err_captcha') : t('anon.err_phone_invalid');
    }
    if (e.status === 429) return t('anon.err_too_many');
    if (e.status === 502) return t('anon.err_sms_failed');
  }
  return t('anon.err_generic');
}

export function confirmCodeErrorMessage(e: unknown, t: TFunction): string {
  if (e instanceof ApiError && e.status === 400) return t('anon.err_code_invalid');
  return t('anon.err_generic');
}

export function anonymousSubmitErrorMessage(e: unknown, t: TFunction): string {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 400:
        return /^photo/i.test(e.message) ? t('anon.err_photo_invalid') : t('anon.err_request_invalid');
      case 401: return t('anon.err_verification_expired');
      case 413: return t('anon.err_photo_too_large');
      case 429: return t('anon.err_daily_limit');
    }
  }
  return t('common.submit_failed');
}

/**
 * Whether a failed anonymous submission used up the verification token.
 * Per the contract only 400 and 413 leave it usable; a network failure never
 * reached the server's token check.
 */
export function submitSpentToken(e: unknown): boolean {
  return e instanceof ApiError && e.status !== 400 && e.status !== 413;
}
