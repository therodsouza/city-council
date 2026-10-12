# Geocoordinates Flow

How a request's `lat`/`lng` are captured, sent, completed by the API and read back.
Related: `docs/api-contract.md` (sections 1, 2, 8), `docs/ANONYMOUS_SUBMISSION_SPEC.md`,
`docs/SERVICE_REQUEST_FORM_SPEC.md` (Step 1), `docs/REQUEST_MAP_SPEC.md`.

```mermaid
sequenceDiagram
    autonumber
    actor U as Person
    participant F as Browser (StepLocation)
    participant M as Google Maps JS
    participant A as API (arena-book-api)
    participant G as Google Geocoding
    participant D as DynamoDB

    Note over U,F: Step 1 – Location (everyone)

    opt "Use my location"
        U->>F: click button
        F->>F: navigator.geolocation (high accuracy, 10 s)
        F->>F: set lat/lng + accuracy
        alt signed in
            F->>A: GET /geocode/reverse?lat&lng (Bearer)
            A->>G: reverse geocode
            G-->>A: address, suburb, postcode
            A-->>F: fill address fields
        else guest
            Note over F: no reverse geocode (needs an account), pin only
        end
    end

    opt Place or adjust the pin by hand
        U->>M: click map / drag marker
        M-->>F: lat/lng (accuracy cleared)
    end

    opt Remove pin
        U->>F: Remove pin
        F->>F: lat/lng = undefined
    end

    Note over U,F: Steps 2–4 – issue, contact, review

    alt Guest
        U->>F: verify phone (SMS + Turnstile)
        F->>A: POST /verification/phone/send + /confirm
        A-->>F: single-use token
        F->>A: POST /anonymous/service-requests<br/>X-Verification-Token, data{lat?, lng?}, photo
    else Signed in
        F->>A: POST /service-requests (Bearer)<br/>data{lat?, lng?}, photo
    end

    Note over A: Anonymous path only, after validation,<br/>token spent and daily cap checked
    alt lat/lng sent
        Note over A: kept as sent, never replaced
    else no lat/lng
        A->>G: forward geocode "address, suburb, CEP, Brasil"<br/>(components=country:BR)
        G-->>A: point + location_type
        alt ROOFTOP / RANGE_INTERPOLATED / GEOMETRIC_CENTER
            Note over A: use the point
        else APPROXIMATE, no result, error, outage
            Note over A: store without coordinates (never fails the submission)
        end
    end
    opt address, suburb or postcode blank
        A->>G: reverse geocode lat/lng
        G-->>A: fill only the blank fields
    end

    A->>D: save request (latitude, longitude, gsi1 geohash if present)
    A-->>F: 201 referenceNumber

    Note over U,D: Later – admin map
    F->>A: GET /service-requests (paged)
    A-->>F: items with latitude/longitude (nullable)
    F->>M: markers (null becomes 0, 0 and is skipped)
```

## Notes

- The signed-in path has no forward-geocoding fallback: a signed-in request without a pin is
  stored with no coordinates.
- Requests without coordinates never get a `gsi1` entry, so `/nearby` never returns them, and
  the admin map skips them.
- The pin never overwrites typed address text, and typing never moves the pin.
- Forward and reverse lookups on the anonymous path only run after the verification token is
  spent and the daily cap passed, so only a verified phone can cause a Google call.
