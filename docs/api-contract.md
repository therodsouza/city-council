# Backend API Contract

Base URL configured via `VITE_API_URL` in the frontend (e.g. `https://api.example.com`).

All endpoints accept and return `application/json`. CORS must allow the frontend origin.

---

## Endpoints

### 1. Reverse Geocode

Translates GPS coordinates into a human-readable address. Called when the user clicks "Use my location" in the location step.

```
GET /geocode/reverse
```

**Query parameters**

| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| `lat`     | float  | yes      | Latitude (decimal degrees)  |
| `lng`     | float  | yes      | Longitude (decimal degrees) |

**Success response — `200 OK`**

```json
{
  "address": "42 Harbour Road",
  "suburb": "Northbridge",
  "postcode": "6003"
}
```

| Field     | Type   | Description                         |
|-----------|--------|-------------------------------------|
| `address` | string | Street number and street name       |
| `suburb`  | string | Suburb or locality name             |
| `postcode`| string | Postal code as a string             |

**Error responses**

| Status | When                                              |
|--------|---------------------------------------------------|
| `400`  | `lat` or `lng` is missing or not a valid number   |
| `404`  | Coordinates fall outside a serviceable area       |
| `502`  | Upstream geocoding provider is unavailable        |

---

### 2. Submit Service Request

Accepts a completed infrastructure report from the public form. Called on final submission after the user agrees to terms.

```
POST /service-requests
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
  "referenceNumber": "SR-2026-12345",
  "submittedAt": "2026-06-04T08:30:00.000Z",
  "location": {
    "address": "42 Harbour Road",
    "suburb": "Northbridge",
    "postcode": "6003",
    "siteType": "Road / Street",
    "notes": "Adjacent to the bus shelter on the eastern footpath."
  },
  "issue": {
    "category": "pothole",
    "severity": "high",
    "description": "Large pothole approximately 30cm wide causing damage to vehicles.",
    "photoName": "IMG_0042.jpg"
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

`referenceNumber` — Client-generated identifier in the format `SR-{year}-{5-digit random}`. Store as-is; it is shown to the user on the success screen.

`submittedAt` — ISO 8601 UTC timestamp of when the user clicked Submit.

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

`issue.photoName` — Optional. Filename of the attached photo, mirroring the `photo` part's filename. Present in `data` when the `photo` part is also included.

`contact.phone` — Optional. May be empty string.

`contact.receiveUpdates` — If `true`, the backend should send status email notifications to `contact.email`.

**Success response — `201 Created`**

```json
{
  "referenceNumber": "SR-2026-12345"
}
```

The frontend does not read this body, but returning the reference number is useful for logging and future extension.

**Error responses**

| Status | When                                              |
|--------|---------------------------------------------------|
| `400`  | Request body fails validation (missing required fields, unknown enum value) |
| `409`  | `referenceNumber` already exists                  |
| `422`  | Business-logic rejection (e.g. location outside jurisdiction) |
| `500`  | Unexpected server error                           |

---

## Notes

- The frontend checks only `response.ok` (status 200–299). Any non-2xx status causes the submit button to throw; the user sees a generic browser error. If you want a user-readable error message, a future iteration will need to read the response body — coordinate before adding that.
- `referenceNumber` is generated client-side for now. The backend should treat it as the authoritative ID (idempotency key) rather than generating its own.
- No authentication header is sent with either request. Both endpoints are currently public.
