# Backend API Contract

Base URL configured via `VITE_API_URL` in the frontend (e.g. `https://api.example.com`).

All endpoints accept and return `application/json`. CORS must allow the frontend origin.

All endpoints require a JWT bearer token, except the three public endpoints for visitors without an account (sections 6, 7 and 8):

```
Authorization: Bearer <token>
```

Any request to a non-public endpoint without a valid token receives `401 Unauthorized`.

## Error response shape

All non-2xx responses return:

```json
{ "message": "Human-readable description of the error" }
```

The frontend reads `response.message` and displays it to the user.

---

## Endpoints

### 1. Reverse Geocode

Translates GPS coordinates into a human-readable address. Called when the user clicks "Use my location" in the location step.

```
GET /geocode/reverse
Authorization: Bearer <token>
```

**Query parameters**

| Parameter | Type  | Required | Description                 |
|-----------|-------|----------|-----------------------------|
| `lat`     | float | yes      | Latitude (decimal degrees)  |
| `lng`     | float | yes      | Longitude (decimal degrees) |

**Success response — `200 OK`**

```json
{
  "address": "42 Harbour Road",
  "suburb": "Northbridge",
  "postcode": "6003"
}
```

| Field      | Type   | Description                   |
|------------|--------|-------------------------------|
| `address`  | string | Street number and street name |
| `suburb`   | string | Suburb or locality name       |
| `postcode` | string | Postal code as a string       |

**Error responses**

| Status | When                                            |
|--------|-------------------------------------------------|
| `400`  | `lat` or `lng` is missing or not a valid number |
| `401`  | Missing or invalid JWT                          |
| `502`  | Upstream geocoding provider is unavailable      |

---

### 2. Submit Service Request

Accepts a completed infrastructure report from the public form. Called on final submission after the user agrees to terms.

```
POST /service-requests
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request parts**

| Part    | Content-Type       | Required | Description                                      |
|---------|--------------------|----------|--------------------------------------------------|
| `data`  | `application/json` | yes      | JSON-encoded service request payload (see below) |
| `photo` | `image/*`          | no       | Image file captured or uploaded by the user      |

**`data` field — JSON schema**

```json
{
  "submittedAt": "2026-06-04T08:30:00.000Z",
  "location": {
    "address": "42 Harbour Road",
    "suburb": "Northbridge",
    "postcode": "6003",
    "lat": -31.9505,
    "lng": 115.8605,
    "siteType": "Road / Street",
    "notes": "Adjacent to the bus shelter on the eastern footpath."
  },
  "issue": {
    "category": "pothole",
    "severity": "high",
    "description": "Large pothole approximately 30cm wide causing damage to vehicles."
  },
  "contact": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "0412 345 678",
    "receiveUpdates": true
  }
}
```

**Field reference**

`submittedAt` — ISO 8601 UTC timestamp of when the user clicked Submit.

`location.lat` / `location.lng` — Optional. Decimal-degree coordinates. Present when the user clicked "Use my location"; absent for manual address entry. Used for geospatial indexing.

`location.siteType` — One of the values below (free-text string, validated by the frontend):
- `Road / Street`
- `Footpath / Pathway`
- `Park / Reserve`
- `Public Building`
- `Stormwater / Drain`
- `Street Lighting`
- `Public Toilet`
- `Other`

`issue.category` — One of:
- `pothole` — Pothole / Road Damage
- `graffiti` — Graffiti / Vandalism
- `broken` — Broken Equipment
- `flooding` — Flooding / Water Damage
- `lighting` — Street Light Outage
- `trees` — Fallen Tree / Branch
- `dumping` — Illegal Dumping / Litter
- `other` — Other Infrastructure

`issue.severity` — One of: `low`, `medium`, `high`

`contact.phone` — Optional. May be empty string.

`contact.receiveUpdates` — If `true`, the user has opted in to status email notifications at `contact.email`. Not yet implemented — the flag is stored but no emails are sent.

**Sending the `data` part from a browser**

The `data` part must be sent as a `Blob` with `Content-Type: application/json` — not as a plain string. A plain string field has no content-type and the server will reject it.

```js
const formData = new FormData()
formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'data.json')
if (photo) formData.append('photo', photo, photo.name)
```

**Photo part**

When included, the backend reads the filename from the `Content-Disposition` header of the `photo` part. Do not include a `photoName` field in the data JSON.

**Success response — `201 Created`**

```json
{
  "referenceNumber": "SR-2026-K7M2XQ4R",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

`referenceNumber` is generated by the server in the format `SR-{year}-{8 random characters}`. The characters come from `A–Z` and `2–9` without `I`, `L`, `O`, `0` or `1`, so a number can be read out over the phone. Requests created before this format existed have `SR-{year}-{5 digits}`. The frontend reads it from this response and shows it on the success screen.

`id` is the internal UUID for the record. The frontend does not need it; it is included for debugging and future use.

**Error responses**

| Status | When                                                                        |
|--------|-----------------------------------------------------------------------------|
| `400`  | Request body fails validation (missing required fields, unknown enum value) |
| `401`  | Missing or invalid JWT                                                      |
| `500`  | Unexpected server error                                                     |

---

### 3. Get User Profile

Called on every session restore, immediately after token validation. The response tells the frontend whether the user has already completed onboarding so it can skip the gate without asking the user to re-submit.

```
GET /users/me
Authorization: Bearer <token>
```

No query parameters, no request body.

**Identity** — the backend must derive the user's identity from the Bearer token only (extract `sub` or `email` from the verified ID token). The frontend does not send a user ID in the request.

**Success response — profile exists (`200 OK`)**

```json
{
  "profileComplete": true,
  "role": "user",
  "name": "Jane Smith",
  "phone": "+61400000000",
  "dateOfBirth": "1990-05-15",
  "gender": "Woman",
  "address": "42 Test St",
  "suburb": "Northbridge",
  "postcode": "6003"
}
```

**Success response — first login, no profile yet (`200 OK`)**

```json
{
  "profileComplete": false,
  "role": "user"
}
```

Returning `200` in both cases keeps the frontend logic simple — it reads `profileComplete` rather than branching on HTTP status.

**Field reference**

| Field            | Type    | Present when              | Description                              |
|------------------|---------|---------------------------|------------------------------------------|
| `profileComplete`| boolean | always                    | `true` if `PUT /users/me` was ever called for this user |
| `role`           | string  | always                    | `"admin"` or `"user"`. Controls access to admin features (e.g. Request Map). |
| `name`           | string  | `profileComplete: true`   | As submitted during onboarding           |
| `phone`          | string  | `profileComplete: true`   |                                          |
| `dateOfBirth`    | string  | `profileComplete: true`   | ISO date, e.g. `"1990-05-15"`            |
| `gender`         | string  | `profileComplete: true`   |                                          |
| `address`        | string  | `profileComplete: true`   | Street address                           |
| `suburb`         | string  | `profileComplete: true`   |                                          |
| `postcode`       | string  | `profileComplete: true`   | 4-digit AU postcode, may be empty string |

**Error responses**

| Status | When                   |
|--------|------------------------|
| `401`  | Missing or invalid JWT |
| `500`  | Unexpected server error|

**How the frontend uses this response**

```
Session restore sequence:
1. Validate auth tokens
2. GET /users/me
3a. profileComplete: true  → initialise user with profileComplete: true and profile data
                             → onboarding gate does not fire
3b. profileComplete: false → initialise user with profileComplete: false
                             → onboarding gate fires, user sees the form
```

---

### 4. Save User Profile

Called once when the user submits the onboarding form. Also used for future profile edits.

```
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body**

```json
{
  "name": "Jane Smith",
  "phone": "+61400000000",
  "dateOfBirth": "1990-05-15",
  "gender": "Woman",
  "address": "42 Test St",
  "suburb": "Northbridge",
  "postcode": "6003"
}
```

**Field reference**

| Field         | Type   | Required | Description                            |
|---------------|--------|----------|----------------------------------------|
| `name`        | string | yes      | Full name from Google profile          |
| `phone`       | string | yes      | Phone number as entered by the user    |
| `dateOfBirth` | string | yes      | ISO date, e.g. `"1990-05-15"`          |
| `gender`      | string | yes      | One of the frontend gender options     |
| `address`     | string | yes      | Street address                         |
| `suburb`      | string | yes      | Suburb                                 |
| `postcode`    | string | no       | 4-digit AU postcode; may be empty string |

The backend should upsert — create on first call, overwrite on subsequent calls.

**Success response — `200 OK`**

Empty body, or:

```json
{ "profileComplete": true }
```

The frontend does not read the response body; it updates local state optimistically on `200`.

**Error responses**

| Status | When                                                      |
|--------|-----------------------------------------------------------|
| `400`  | Missing required field or invalid `dateOfBirth` format    |
| `401`  | Missing or invalid JWT                                    |
| `500`  | Unexpected server error                                   |

---

### 5. Delete User Account

Permanently deletes the authenticated user's profile record. Intended for account self-deletion flows.

```
DELETE /users/me
Authorization: Bearer <token>
```

No query parameters, no request body.

**Identity** — the backend derives the user's identity from the Bearer token (`sub` claim). The frontend does not send a user ID.

**Success response — `204 No Content`**

Empty body. The profile record has been removed. If no profile existed for this user, the response is still `204` — the operation is idempotent.

**What is deleted**

| Store           | Action                                       |
|-----------------|----------------------------------------------|
| DynamoDB `users`| Profile record for this `sub` is deleted     |
| Service requests| Not affected — requests have no owner field  |
| S3 images       | Not affected — image keys carry no user link |

**Error responses**

| Status | When                   |
|--------|------------------------|
| `401`  | Missing or invalid JWT |
| `500`  | Unexpected server error|

---

### 6. Send Phone Verification Code (public)

First step of submitting without an account. Texts a 6-digit code to a Brazilian mobile number. **No `Authorization` header.**

```
POST /verification/phone/send
Content-Type: application/json
```

**Request body**

```json
{
  "phone": "(11) 91234-5678",
  "captchaToken": "<token from the Cloudflare Turnstile widget>"
}
```

| Field          | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `phone`        | string | yes      | A Brazilian **mobile** number. Accepted forms: `(11) 91234-5678`, `11912345678`, `+55 11 91234-5678`, `5511912345678`. It must have a valid area code (DDD) and a mobile number (`9` followed by 8 digits); landlines are rejected because they cannot receive the code. |
| `captchaToken` | string | yes      | The token produced by the Turnstile widget. Each token works **once**: after any failed or successful call, get a fresh one from the widget. |

**Success response — `202 Accepted`** (no body)

The code was sent. It is valid for 10 minutes. Sending again replaces the earlier code, which then stops working.

**Error responses**

| Status | `message`                                          | When |
|--------|----------------------------------------------------|------|
| `400`  | `Enter a Brazilian mobile number with area code`   | `phone` is missing or not a valid Brazilian mobile number |
| `400`  | `Captcha verification failed`                      | `captchaToken` is missing, expired, already used or rejected |
| `429`  | `Too many attempts, try again later`               | A rate limit was hit: per phone number, per IP address, or for the whole service per day |
| `502`  | `Could not send the code, try again later`         | The SMS provider failed. The code is discarded; try again |

The limits today are 3 sends per number per hour, 10 per IP per hour and 50 per day across all users. They are configuration, not part of the contract, so do not hard-code them in the UI; just handle `429`.

---

### 7. Confirm Phone Verification Code (public)

Second step. Exchanges the code from the SMS for a short-lived token that proves the number. **No `Authorization` header.**

```
POST /verification/phone/confirm
Content-Type: application/json
```

**Request body**

```json
{ "phone": "(11) 91234-5678", "code": "483920" }
```

`phone` takes the same forms as in section 6 and does not need to be written the same way as before. `code` is the 6 digits from the SMS.

**Success response — `200 OK`**

```json
{ "token": "q3Zk…", "expiresInSeconds": 900 }
```

| Field              | Type   | Description |
|--------------------|--------|-------------|
| `token`            | string | Opaque. Send it unchanged in the `X-Verification-Token` header of section 8. |
| `expiresInSeconds` | number | How long the token stays valid (15 minutes). The token can be used **once**. |

**Error responses**

| Status | `message`                 | When |
|--------|---------------------------|------|
| `400`  | `Invalid or expired code` | Wrong code, expired code, code already used, or 5 wrong attempts on this code. The response never says which. After 5 wrong attempts even the right code fails; ask for a new one (section 6). |

---

### 8. Submit Service Request Anonymously (public)

Creates a service request without an account, using the token from section 7. **No `Authorization` header.**

```
POST /anonymous/service-requests
X-Verification-Token: <token from section 7>
Content-Type: multipart/form-data
```

**Request parts** are the same as section 2: `data` (JSON, sent as a `Blob` with `Content-Type: application/json`) and an optional `photo`. The `X-Verification-Token` header is a custom header, so browsers send a CORS preflight; the server allows it.

**Differences from section 2**

- The request is stored against the **verified phone number**, not an account. The number is not echoed back and is visible to administrators only.
- `contact.email` is stored exactly as typed. It is **not verified** and is never used to grant access.
- Fields are validated more strictly, because anyone on the internet can call this endpoint:

| Field                      | Rule |
|----------------------------|------|
| `submittedAt`              | required |
| `location.address`         | required **unless `lat`/`lng` are sent**, up to 300 characters |
| `location.suburb`          | up to 100 characters |
| `location.postcode`        | up to 20 characters |
| `location.siteType`        | up to 100 characters |
| `location.notes`           | up to 1000 characters |
| `location.lat` / `lng`     | both or neither; within −90…90 and −180…180 |
| `issue.category`           | required, one of the values in section 2 |
| `issue.severity`           | required, one of `low`, `medium`, `high` |
| `issue.description`        | required, up to 2000 characters |
| `contact.name`             | required, up to 200 characters |
| `contact.email`            | optional, up to 254 characters |
| `contact.phone`            | optional, up to 30 characters; free text, separate from the verified number |

- The `photo` must be a **JPEG, PNG or WebP** of at most **5 MB**, and its content must really be that type. Other types and renamed files are rejected.

**Address from coordinates.** There is no public reverse-geocoding endpoint (section 1 needs a login). Instead, send `location.lat` and `location.lng` and leave `address`, `suburb` and `postcode` blank: the server looks them up after the phone verification has passed and stores what it finds. Anything the person typed is kept as typed; only blank fields are filled. This is best effort. If the lookup finds nothing or the provider is down, the request is still created with the blank fields stored as empty strings and the coordinates intact, so the form cannot count on the address being filled in. The response does not echo the address.

**Coordinates from the address.** The opposite fallback: when `location.lat` and `location.lng` are missing, the server looks up the typed address (street, neighbourhood and CEP, restricted to Brazil) after the phone verification has passed, and stores the coordinates it finds. Coordinates the person sent, whether from "Use my location" or a pin placed on the map, are never replaced. This is best effort. Only street-level or better results are used; a result that only identifies a city or region is discarded. If nothing usable is found or the provider is down, the request is still created, without coordinates. The response does not echo them.

**Success response — `201 Created`**

```json
{
  "referenceNumber": "SR-2026-K7M2XQ4R",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

There is no `Location` header: an anonymous caller cannot fetch the request afterwards. **The reference number is the only receipt the person gets**, so the success screen should show it prominently and offer to copy it.

**Error responses**

| Status | `message`                                                  | When |
|--------|------------------------------------------------------------|------|
| `400`  | `Invalid request body`                                     | `data` is not valid JSON for the schema |
| `400`  | A field message such as `issue.description is required`    | A rule in the table above is broken |
| `400`  | `Photo must be a JPEG, PNG or WebP image`, `Photo content does not match its type` | The photo is not acceptable |
| `401`  | `Phone verification is required or has expired`            | Header missing, token unknown, expired, or already used |
| `413`  | none guaranteed                                            | The photo is larger than 5 MB. Rejected before the endpoint runs, so the body may not use the standard error shape. Check the size in the browser first |
| `429`  | `Too many submissions from this number today`              | The verified number already submitted the daily maximum (5) |
| `500`  | none guaranteed                                            | Unexpected server error |

**When the token is spent.** The token is checked only after `data` and `photo` pass validation. A `400` or `413` leaves it usable, so the person can fix the form and resubmit with the same token. After that point it is gone: a `201`, a `429` or even a `500` means the person must verify the phone again (sections 6 and 7).

**Typical flow for the frontend**

1. Show the form; ask for the phone number and render the Turnstile widget.
2. `POST /verification/phone/send` with the number and the widget token (section 6).
3. Ask for the 6-digit code; `POST /verification/phone/confirm` (section 7); keep the returned `token` in memory only.
4. `POST /anonymous/service-requests` with the form and the token header (section 8). Show `referenceNumber`.
5. Reset the widget and discard the token after every call.

---

### 9. Get Service Request

Returns one request in full. Admins can read any request; other users only their own (anything else is `404`). The detail page of the admin console uses this.

```
GET /service-requests/{id}
Authorization: Bearer <token>
```

**Success response — `200 OK`**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "referenceNumber": "SR-2026-K7M2XQ4R",
  "status": "in_progress",
  "createdAt": "2026-06-04T08:30:01.120Z",
  "updatedAt": "2026-06-05T14:02:11.480Z",
  "submittedAt": "2026-06-04T08:30:00.000Z",
  "address": "42 Harbour Road",
  "suburb": "Northbridge",
  "postcode": "6003",
  "latitude": -31.9505,
  "longitude": 115.8605,
  "siteType": "Road / Street",
  "locationNotes": "Adjacent to the bus shelter.",
  "category": "pothole",
  "severity": "high",
  "issueDescription": "Large pothole approximately 30cm wide.",
  "contactName": "Jane Smith",
  "contactEmail": "jane@example.com",
  "contactPhone": "0412 345 678",
  "receiveUpdates": true,
  "imagePath": "images/3f6c…_photo.jpg",
  "imageUrl": "https://…amazonaws.com/images/3f6c…_photo.jpg?X-Amz-Signature=…",
  "statusHistory": [
    { "status": "received", "changedAt": "2026-06-04T08:30:01.120Z", "changedBySub": "1088…", "changedByEmail": "jane@example.com" },
    { "status": "in_progress", "changedAt": "2026-06-05T14:02:11.480Z", "changedBySub": "1177…", "changedByEmail": "admin@example.com", "note": "Crew booked for Thursday" }
  ]
}
```

| Field            | Type   | Description |
|------------------|--------|-------------|
| `status`         | string | One of `received`, `under_review`, `in_progress`, `resolved`, `closed`. Requests created before statuses existed read as `received`. |
| `updatedAt`      | string | When the status last changed. Absent if it never has. |
| `imageUrl`       | string | A temporary link (valid 15 minutes) to the photo; absent when the request has no photo. Load it straight into an `<img>`; it needs no `Authorization` header. Fetch the request again for a fresh link. `imagePath` is the internal storage key and is of no use to the browser. |
| `statusHistory`  | array  | Oldest first. Each entry: `status`, `changedAt`, and, when known, `changedBySub`, `changedByEmail` and `note`. The first entry is the submission itself. Present on this endpoint only; the list endpoint leaves it out. |

`GET /service-requests` returns the same fields per item (including `status` and `updatedAt`) but never `statusHistory` or `imageUrl`.

**Error responses**

| Status | When |
|--------|------|
| `401`  | Missing or invalid JWT |
| `404`  | No such request, or the caller may not see it |

---

### 10. Update Request Status (admin)

Sets a request's status and appends an entry to its history. Any status may be set from any other.

```
PATCH /service-requests/{id}/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body**

```json
{ "status": "in_progress", "note": "Crew booked for Thursday" }
```

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `status` | string | yes      | One of `received`, `under_review`, `in_progress`, `resolved`, `closed` |
| `note`   | string | no       | Up to 1000 characters; blank is treated as absent. Shown in the history. |

Sending the status the request already has is accepted **only with a `note`**; this logs a comment without changing anything.

**Success response — `200 OK`**

The updated request, in the shape of section 9 (with `statusHistory` and `imageUrl`). The history entry records the admin's `sub` and token email.

**Error responses**

| Status | `message`                                                          | When |
|--------|--------------------------------------------------------------------|------|
| `400`  | `status is required`                                               | `status` missing |
| `400`  | `note must be at most 1000 characters`                             | Note too long |
| `400`  | `Request already has this status; add a note to log a comment`     | Same status and no note |
| `400`  | —                                                                  | `status` is not one of the values above (the body fails to parse; the message is not guaranteed) |
| `401`  | —                                                                  | Missing or invalid JWT |
| `403`  | —                                                                  | The caller is not an admin |
| `404`  | —                                                                  | No such request |

Changes are applied atomically, so two admins acting at once each leave their own history entry.

`contact.receiveUpdates` e-mails are still not sent: changing a status does not notify the reporter.

---

## Notes

- All endpoints require JWT auth, except sections 6, 7 and 8, which are public by design.
- Requests submitted anonymously cannot be read, edited or deleted by the person who sent them; only administrators can. There is no anonymous lookup yet.
- `referenceNumber` is server-generated. The frontend must not generate or send it; read it from the `201` response body.
- `contact.receiveUpdates` is stored but email delivery is not yet implemented. Do not communicate to the user that they will receive emails until this is wired up.
- `GET /users/me` must be implemented before the onboarding gate will correctly skip returning users. Until it is, all users are prompted to complete the form on every page load.
