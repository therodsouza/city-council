import { ApiError, toApiError } from './ApiError';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** Code accepted by the dev mock when no VITE_API_URL is configured. */
export const DEV_VERIFICATION_CODE = '123456';

export interface PhoneVerification {
  token: string;
  expiresInSeconds: number;
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Texts a 6-digit code to a Brazilian mobile number. Public endpoint, no Authorization header. */
export async function sendPhoneCode(phone: string, captchaToken: string): Promise<void> {
  if (!API_URL) {
    console.log('[PhoneVerification] No VITE_API_URL configured — pretending to send a code to', phone);
    return;
  }

  const response = await postJson('/verification/phone/send', { phone, captchaToken });
  if (!response.ok) throw await toApiError(response, 'Could not send the code');
}

/** Exchanges the SMS code for a one-use token proving the number. */
export async function confirmPhoneCode(phone: string, code: string): Promise<PhoneVerification> {
  if (!API_URL) {
    if (code !== DEV_VERIFICATION_CODE) throw new ApiError(400, 'Invalid or expired code');
    return { token: 'dev-verification-token', expiresInSeconds: 900 };
  }

  const response = await postJson('/verification/phone/confirm', { phone, code });
  if (!response.ok) throw await toApiError(response, 'Could not confirm the code');
  return response.json() as Promise<PhoneVerification>;
}
