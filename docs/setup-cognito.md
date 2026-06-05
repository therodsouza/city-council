# AWS Cognito Identity Pool Setup

What to configure on the AWS side so the implicit-flow authentication described in [`auth-flow.md`](./auth-flow.md) can exchange a Google ID token for temporary AWS credentials.

> **Identity Pool, not User Pool.** This project uses a Cognito **Identity Pool** (Federated Identities) — the federation primitive that hands out IAM-scoped temporary credentials. Cognito **User Pools** are a different product (a user directory + hosted UI) and are **not** used here. The two often appear together in tutorials; keep them separate when reading docs.

Prerequisites: an AWS account, the AWS CLI configured (or use the Console), and a completed [`setup-google.md`](./setup-google.md) so you have a Google **Client ID** to paste in.

## 1. Create the Identity Pool

**Console path:** Amazon Cognito → **Identity pools** → **Create identity pool**.

1. **Configure identity pool trust**
   - **User access:** *Authenticated access*.
   - **Authenticated identity sources:** check **Federated identities**.
2. **Configure permissions**
   - **Authenticated role:** *Create a new IAM role*; name it e.g. `Cognito_<PoolName>_Auth_Role`. (You'll attach permissions in step 3.)
   - **Guest access:** *not used* unless you also want unauthenticated identities. Skip it for this app.
3. **Connect identity providers**
   - Choose **Google**.
   - **Google client ID:** paste the *Web application* client ID from Google Cloud Console (`xxxxxxxx-yyy.apps.googleusercontent.com`). This is the same value that goes in `REACT_APP_GOOGLE_CLIENT_ID`.
   - Cognito uses this to verify the `aud` claim of the ID tokens it receives.
4. **Configure properties**
   - **Identity pool name:** e.g. `arena-book-identities`.
5. **Review and create.**
6. After creation, copy:
   - **Identity pool ID** (looks like `us-east-1:abcd1234-…`) → goes into `REACT_APP_COGNITO_IDENTITY_POOL_ID`.
   - **AWS Region** (e.g. `us-east-1`) → goes into `REACT_APP_COGNITO_REGION`.

### Equivalent CLI

```bash
aws cognito-identity create-identity-pool \
  --identity-pool-name arena-book-identities \
  --no-allow-unauthenticated-identities \
  --supported-login-providers accounts.google.com=<GOOGLE_CLIENT_ID> \
  --region us-east-1
```

## 2. IAM trust policy for the authenticated role

This is the policy that says "Cognito Identity is allowed to assume this role on behalf of *authenticated* users of *this specific pool*". The Console-generated role already has the right trust policy, but if you create the role manually or audit it, it must look like this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "cognito-identity.amazonaws.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "<IDENTITY_POOL_ID>"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }
    }
  ]
}
```

Replace `<IDENTITY_POOL_ID>` with the full pool ID (e.g. `us-east-1:abcd1234-…`).

> **Why both conditions matter.** `aud` ties the role to your specific pool — without it, any Cognito Identity Pool in any account could assume the role. `amr=authenticated` rejects unauthenticated (guest) identities, which would otherwise also satisfy `aud`.

## 3. Permissions policy for the authenticated role

The temporary credentials Cognito hands back will be allowed to do whatever this role's attached permission policies allow. **Grant only what the SPA actually calls** with the AWS SDK from the browser. Two common patterns:

### Per-user S3 prefix (recommended starting point)

Lets each authenticated user read/write only objects under `s3://<bucket>/private/<cognito-identity-id>/*`. The `${cognito-identity.amazonaws.com:sub}` variable resolves to the caller's identity ID at request time.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::<your-bucket>/private/${cognito-identity.amazonaws.com:sub}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<your-bucket>",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["private/${cognito-identity.amazonaws.com:sub}/*"]
        }
      }
    }
  ]
}
```

### Bare minimum (no AWS access)

If your SPA only needs to **prove identity** (e.g., the credentials are forwarded to your own API which authorises separately), attach no policy at all. The credentials still exist but can't call anything.

```json
{ "Version": "2012-10-17", "Statement": [] }
```

> **Do not attach `AdministratorAccess` or any broad managed policy** — these credentials live in the browser. Anyone who reads them in DevTools gets the same access.

## 4. (Optional) S3 bucket setup

The repo includes `aws/cors-config.json` and `aws/policies/bucket-policy.json` as a template for an S3 bucket the app reads from. These are **only** relevant if your app actually serves objects out of S3 to the browser — they are not part of the authentication flow itself.

- `aws/cors-config.json` — allows browsers from any origin to `GET`/`HEAD` the bucket. Apply with:
  ```bash
  aws s3api put-bucket-cors --bucket <your-bucket> --cors-configuration file://aws/cors-config.json
  ```
- `aws/policies/bucket-policy.json` — makes objects publicly readable. **Only suitable for genuinely public assets.** For per-user private data, drop this and rely on the IAM role permissions above. Apply with:
  ```bash
  aws s3api put-bucket-policy --bucket <your-bucket> --policy file://aws/policies/bucket-policy.json
  ```

If you don't use S3 in your replica, skip this section entirely.

## 5. Verify the wiring end-to-end

After steps 1–3, the app should be able to sign in. Quick sanity checks:

```bash
# Does Cognito recognise the pool and the Google login provider?
aws cognito-identity describe-identity-pool \
  --identity-pool-id <IDENTITY_POOL_ID> --region <REGION>
# → Output should include "SupportedLoginProviders": { "accounts.google.com": "<your client id>" }
```

In the browser after signing in, the Network tab will show two calls to `cognito-identity.<region>.amazonaws.com`: `GetId` then `GetCredentialsForIdentity`. Both should return 200. If either returns `NotAuthorizedException`, the Google Client ID configured in the pool doesn't match the `aud` claim of the ID token Google issued — re-check that both Cognito and `.env` use the **same** Web client ID.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `NotAuthorizedException: Invalid login token. Issuer doesn't match providerName` | Cognito's configured Google client ID doesn't match the ID token's `aud`. | Make sure both the pool's "Authenticated identity sources → Google" client ID and `REACT_APP_GOOGLE_CLIENT_ID` are the same Web application client ID. |
| `InvalidIdentityPoolConfigurationException` | The pool exists but no IAM role is attached to the authenticated identity. | In the Console, **Edit identity pool → Authenticated role → assign**. |
| `AccessDenied` on every AWS SDK call after sign-in | Trust policy is right (sign-in succeeds) but permissions policy is empty or doesn't cover the action. | Attach a permissions policy to the authenticated role. |
| Credentials work for one user but `AccessDenied` for another | Permissions policy uses a hard-coded identity ID instead of `${cognito-identity.amazonaws.com:sub}`. | Use the variable so each user's identity scopes its own resources. |
| Browser request to `cognito-identity.…amazonaws.com` is blocked by CORS | Almost never a real Cognito problem — usually a wrong endpoint URL. Cognito Identity allows browser calls by default. | Verify the SDK is using `region` matching the pool. |

## What ends up in `.env`

```env
REACT_APP_COGNITO_IDENTITY_POOL_ID=us-east-1:abcd1234-ef56-7890-abcd-1234567890ab
REACT_APP_COGNITO_REGION=us-east-1
```
