# Google Cloud Console Setup

What to configure in Google Cloud Console so the implicit-flow authentication described in [`auth-flow.md`](./auth-flow.md) works. These steps are the minimum required for a clean-slate project.

## 1. Create / select a project

1. Open <https://console.cloud.google.com/>.
2. Top bar → project selector → **New Project** (or pick an existing one).
3. Note the project ID; you won't need it in the app config, but it identifies where the OAuth client lives.

## 2. Configure the OAuth consent screen

The consent screen is required before you can create credentials.

1. **APIs & Services → OAuth consent screen**.
2. **User Type**: `External` for any app that will be used by accounts outside a Google Workspace; `Internal` only if every user is in the same Workspace.
3. **App information**: name, user-support email, developer contact email. These appear on Google's consent dialog.
4. **Scopes**: add the three the app requests — `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`. (You can leave the rest empty.)
5. **Test users** (only relevant while the app is in "Testing" status): add every Google account that will sign in before publishing. Until you publish to "In production", any account not on this list will be rejected with `Error 403: access_denied`.

You do **not** need to enable the "Google+ API" — that API is deprecated. The `openid` scope alone is enough for the ID token; `email` and `profile` enrich the ID token claims.

## 3. Create an OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. **Application type:** `Web application`. *(Critical — not Desktop, not iOS, not "TVs and Limited Input". Web application is the only type that accepts `response_type=token id_token` from a browser without a `client_secret`.)*
3. **Name:** anything; only visible in the console.
4. **Authorized JavaScript origins** — add **every origin** the SPA will be served from. Origin = scheme + host + port, no path.
   - `http://localhost:3000` (dev)
   - `https://your-prod-domain.example.com`
5. **Authorized redirect URIs** — add **every full callback URL** that will appear as `redirect_uri` in the authorize request. Must match exactly, including scheme, host, port, and path.
   - `http://localhost:3000/auth/callback`
   - `https://your-prod-domain.example.com/auth/callback`

   These must match whatever `REACT_APP_REDIRECT_URI` resolves to at runtime. The app defaults to `${window.location.origin}/auth/callback` when the env var is unset (see `src/config/auth.ts`).
6. **Create.** Copy the **Client ID** (`xxxxxxxx-yyy.apps.googleusercontent.com`) into the app's `.env` as `REACT_APP_GOOGLE_CLIENT_ID`.

You do **not** need the `client_secret`. The implicit flow does not use it; the secret only matters for the Authorization Code flow with a backend exchange.

## 4. (Later) Publish the OAuth consent screen

While the consent screen is in "Testing", only the test users you listed can sign in, and Google shows a "This app isn't verified" interstitial. To make the app generally available:

1. **OAuth consent screen → Publishing status → Publish app**.
2. If your requested scopes are limited to `openid`, `email`, `profile`, no verification is required — the app moves straight to "In production".
3. If you add **sensitive** or **restricted** scopes later (e.g. `drive`, `gmail.readonly`), Google will require security verification before publishing.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` | The `redirect_uri` sent to Google doesn't exactly match an entry in **Authorized redirect URIs**. | Add the exact value (including trailing path) to the credential. The string must match byte-for-byte — `http` vs `https`, trailing slash, port, all count. |
| `Error 403: access_denied` while in "Testing" | User account isn't in the test users list. | Add them, or publish the consent screen. |
| `Error 400: invalid_request` with "Missing required parameter: client_id" | `REACT_APP_GOOGLE_CLIENT_ID` is empty or the placeholder string. | Restart `npm start` after editing `.env` — Create React App only reads `.env` at boot. |
| Page loads `/auth/callback` but no `id_token` in the URL | OAuth client type isn't `Web application`. | Recreate the credential with the correct type. |
| `idpiframe_initialization_failed` (only if you also use GIS) | Third-party cookies blocked in browser. | Not relevant to this flow — it uses a full-page redirect, not GIS — but worth knowing if you mix flows. |

## What ends up in `.env`

```env
REACT_APP_GOOGLE_CLIENT_ID=xxxxxxxx-yyyyyyyy.apps.googleusercontent.com
REACT_APP_REDIRECT_URI=http://localhost:3000/auth/callback
REACT_APP_OAUTH_SCOPES=openid,email,profile
```
