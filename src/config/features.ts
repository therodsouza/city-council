/**
 * How a guest (no account) proves they are a real person before submitting:
 * a code sent by SMS or by email. `off` hides the guest option entirely.
 * The API must have the same channel enabled; this only picks what the UI offers.
 */
export type GuestVerificationChannel = 'sms' | 'email';
export type GuestVerificationSetting = GuestVerificationChannel | 'off';

const raw = import.meta.env.VITE_GUEST_VERIFICATION?.trim().toLowerCase();

export const guestVerificationSetting: GuestVerificationSetting =
  raw === 'email' || raw === 'off' ? raw : 'sms';

export const guestsAllowed = guestVerificationSetting !== 'off';

/** The channel the verification card uses. Only meaningful when `guestsAllowed`. */
export const guestVerificationChannel: GuestVerificationChannel =
  guestVerificationSetting === 'email' ? 'email' : 'sms';
