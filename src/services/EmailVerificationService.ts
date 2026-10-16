import { ApiError, toApiError } from './ApiError';
import { DEV_VERIFICATION_CODE, type PhoneVerification } from './PhoneVerificationService';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** Same shape as the phone flow: an opaque, single-use token plus its lifetime. */
export type EmailVerification = PhoneVerification;

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Emails a 6-digit code. Public endpoint, no Authorization header. `locale` picks the email's language. */
export async function sendEmailCode(email: string, captchaToken: string, locale: string): Promise<void> {
  if (!API_URL) {
    console.log('[EmailVerification] No VITE_API_URL configured — pretending to send a code to', email);
    return;
  }

  const response = await postJson('/verification/email/send', { email, captchaToken, locale });
  if (!response.ok) throw await toApiError(response, 'Could not send the code');
}

/** Exchanges the emailed code for a one-use token proving the address. */
export async function confirmEmailCode(email: string, code: string): Promise<EmailVerification> {
  if (!API_URL) {
    if (code !== DEV_VERIFICATION_CODE) throw new ApiError(400, 'Invalid or expired code');
    return { token: 'dev-verification-token', expiresInSeconds: 900 };
  }

  const response = await postJson('/verification/email/confirm', { email, code });
  if (!response.ok) throw await toApiError(response, 'Could not confirm the code');
  return response.json() as Promise<EmailVerification>;
}
