# CEP Lookup — Design Specification

Typing a complete CEP fills in the street and neighbourhood. Used in the service
request form (`StepLocation`) and onboarding (`OnboardingForm`), for guests and
signed-in users alike. It needs no account, no API key and no backend change.

## How it works

- `src/services/CepService.ts` calls free public services **directly from the browser**:
  1. OpenCEP `https://opencep.com/v1/{cep}` (static files on a CDN; open source)
  2. ViaCEP `https://viacep.com.br/ws/{cep}/json/` (fallback)
- Each call has a 4 s timeout. Any failure, timeout, HTTP error or "not found" moves on
  to the next provider. Both return `logradouro / bairro / localidade / uf`.
- ViaCEP reports an unknown CEP as **HTTP 200 with `{"erro":"true"}`**, so the body is
  checked, not just the status. OpenCEP uses a 404.
- Lookup **never throws and never blocks the form**. If nothing is found the person
  types the address as before. Successful lookups are cached for the session.
- `src/hooks/useCepAutofill.ts` fires the lookup when the CEP reaches 8 digits.

## Rules

- The CEP field is formatted as typed (`01310-100`).
- A field is filled only if it is empty or still holds a previous suggestion, so a
  corrected CEP replaces the old suggestion but typed text is never overwritten.
- Answers for an outdated CEP are ignored (out-of-order responses).
- The street is filled without a number; focus moves to the address field with the
  cursor at the end so the person adds it (request form).
- **Coordinates are not used.** A CEP can cover a street or a whole town, so it is not
  the location of the issue; `location.lat/lng` stay "Use my location" only.
- City and state are not stored: the form and the API contract have no city field.
- A city-wide CEP has no street or neighbourhood to offer and shows the "enter it
  manually" message.

## Privacy

The browser (IP address and the CEP) is exposed to OpenCEP / ViaCEP, and only the CEP
is sent. The field hint says so. **The privacy policy should mention this third-party
call (LGPD).** If that is a concern, the alternative is a backend proxy endpoint.

## Limits and risks

- Neither provider publishes a hard SLA or numeric rate limit; the free services can
  change or disappear. OpenCEP's dataset can be self-hosted if needed.
- Worst case before the manual message is two timeouts (about 8 s).
- If the app gets a CSP, `connect-src` must allow `https://opencep.com` and
  `https://viacep.com.br`.
