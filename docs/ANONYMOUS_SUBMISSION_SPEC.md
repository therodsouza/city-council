# Anonymous Submission — Design Specification

Lets a visitor without an account submit a service request by proving ownership of
a Brazilian mobile number (SMS) or an email address. Which one is a build-time flag
(see Configuration). Backend contract: `docs/api-contract.md` sections 6–8 (SMS) and 7a (email, proposed).

## User flow

1. Login page → **Continue without an account** (guest mode; header shows **Sign in**).
2. Same 4-step form, with guest differences below.
3. **Review step** shows a *Verify your mobile number* (or *email*) card above the terms checkbox:
   phone or email + Turnstile → `POST /verification/{phone|email}/send` → 6-digit code →
   `POST /verification/{phone|email}/confirm` → verified.
4. **Submit** stays disabled until verified. It calls
   `POST /anonymous/service-requests` with `X-Verification-Token`.
5. Success screen: reference number (copy button) — the only receipt.

Verification happens on the last step so the 15-minute token cannot expire while
the person is still filling in the form.

## Guest differences from the account flow

| Area | Behaviour for guests |
|---|---|
| Location | "Use my location" only drops a pin (`/geocode/reverse` requires a JWT, so the address is not filled in); the map pin can also be placed or dragged by hand. The payload carries `location.coordinates = {type: "custom", lat, lng}` when a pin is set; without a pin it carries `{type: "address"}` and the server locates the typed address (api-contract section 8) |
| Contact | Email optional (omitted from the payload when empty); "email updates" checkbox hidden while email is empty and `receiveUpdates` is sent as `false` |
| Photo | JPEG/PNG/WebP ≤ 5 MB, checked after compression (other types are re-encoded as JPEG). Applies to every user |
| Field limits | `maxLength` on inputs matching the contract (applies to every user) |
| Success | Copy button, "cannot be looked up later" note, no Track button, no email promise |

## Token handling (contract section 8)

The token is kept in `ServiceRequestForm` state only (never storage) with a local
expiry (`expiresInSeconds`).

| Result | Token | UI |
|---|---|---|
| `201` | spent | success screen |
| `400` / `413` | **kept** | fix the form and resubmit |
| `401`, `429`, `500`, other | spent | verification card resets, form data kept |
| network failure | kept | generic error |

Turnstile tokens are single-use: the widget is reset after every send attempt, and
resending a code returns to the contact step to obtain a fresh token.

## Errors

The API's `message` is English and not guaranteed for 413/500, so the UI maps by
status (and, for the two 400s on send, by the documented message) to i18n keys under
`anon.*`. See `src/i18n/errors.ts`. Rate limits are never hard-coded; only `429` is handled.

## Configuration

- `VITE_GUEST_VERIFICATION` — how guests receive the code: `sms` (default), `email`, or `off`
  (hides "Continue without an account"). Read in `src/config/features.ts`; baked at build time, so
  changing it needs a redeploy. Only one channel is active at a time, and the API must have the same
  channel enabled. Channel-specific copy lives under `anon.sms.*` / `anon.email.*`.
- `VITE_TURNSTILE_SITE_KEY` — public Turnstile site key (the secret stays on the API).
  Local dev can use Cloudflare's test key `1x00000000000000000000AA`.
- The Turnstile hostname allow-list in Cloudflare must include every origin serving the app.
- Without `VITE_API_URL` the flow runs on built-in mocks (code `123456` for either channel, no captcha).
- If the host sets a CSP, it must allow `https://challenges.cloudflare.com` for script and frame.

## Files

- `src/config/features.ts` (the flag)
- `src/services/PhoneVerificationService.ts`, `EmailVerificationService.ts`, `ApiError.ts`; `submitAnonymousServiceRequest` in `ServiceRequestService.ts`
- `src/components/GuestVerification.tsx` (shared flow, per-channel config), `TurnstileWidget.tsx`
- `src/i18n/errors.ts`, `src/utils/phone.ts`, `src/utils/email.ts`
- Guest branching: `App.tsx`, `ServiceRequestForm.tsx`, `StepLocation/Contact/Review`, `SuccessScreen`, `SiteHeader`, `Login`

## Known limits

- Signing in from guest mode redirects to Google, so any unsent form data is lost.
- Anonymous requests cannot be tracked; no anonymous lookup exists in the API yet.
