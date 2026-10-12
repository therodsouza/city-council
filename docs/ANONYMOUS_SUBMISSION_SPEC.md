# Anonymous Submission — Design Specification

Lets a visitor without an account submit a service request by proving ownership of
a Brazilian mobile number. Backend contract: `docs/api-contract.md` sections 6–8.

## User flow

1. Login page → **Continue without an account** (guest mode; header shows **Sign in**).
2. Same 4-step form, with guest differences below.
3. **Review step** shows a *Verify your mobile number* card above the terms checkbox:
   phone + Turnstile → `POST /verification/phone/send` → 6-digit code →
   `POST /verification/phone/confirm` → verified.
4. **Submit** stays disabled until verified. It calls
   `POST /anonymous/service-requests` with `X-Verification-Token`.
5. Success screen: reference number (copy button) — the only receipt.

Verification happens on the last step so the 15-minute token cannot expire while
the person is still filling in the form.

## Guest differences from the account flow

| Area | Behaviour for guests |
|---|---|
| Location | "Use my location" only drops a pin (`/geocode/reverse` requires a JWT, so the address is not filled in); the map pin can also be placed or dragged by hand. The payload carries `lat`/`lng` when a pin is set. Without a pin the server locates the typed address as a fallback (api-contract section 8) |
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
resending a code returns to the phone step to obtain a fresh token.

## Errors

The API's `message` is English and not guaranteed for 413/500, so the UI maps by
status (and, for the two 400s on send, by the documented message) to i18n keys under
`anon.*`. See `src/i18n/errors.ts`. Rate limits are never hard-coded; only `429` is handled.

## Configuration

- `VITE_TURNSTILE_SITE_KEY` — public Turnstile site key (the secret stays on the API).
  Local dev can use Cloudflare's test key `1x00000000000000000000AA`.
- The Turnstile hostname allow-list in Cloudflare must include every origin serving the app.
- Without `VITE_API_URL` the flow runs on built-in mocks (SMS code `123456`, no captcha).
- If the host sets a CSP, it must allow `https://challenges.cloudflare.com` for script and frame.

## Files

- `src/services/PhoneVerificationService.ts`, `ApiError.ts`; `submitAnonymousServiceRequest` in `ServiceRequestService.ts`
- `src/components/PhoneVerification.tsx`, `TurnstileWidget.tsx`
- `src/i18n/errors.ts`, `src/utils/phone.ts`
- Guest branching: `App.tsx`, `ServiceRequestForm.tsx`, `StepLocation/Contact/Review`, `SuccessScreen`, `SiteHeader`, `Login`

## Known limits

- Signing in from guest mode redirects to Google, so any unsent form data is lost.
- Anonymous requests cannot be tracked; no anonymous lookup exists in the API yet.
