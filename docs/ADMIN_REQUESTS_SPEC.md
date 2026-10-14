# Admin Request Management — Specification

**Access:** administrators only (`user.isAdmin`, from `role: "admin"` in `GET /users/me`)
**Depends on:** `api-contract.md` (sections 9 and 10), `REQUEST_MAP_SPEC.md`, `I18N_SPEC.md`

---

## Overview

Two screens for working through service requests:

- **List** (`/admin/requests`): every request, with search and filters.
- **Detail** (`/admin/requests/:id`): one request in full, where the admin changes its status and assesses its severity.

Admins reach the list from the **Manage Requests** button in the header (next to Request Map). The map's pin panel has an **Open details** button that goes straight to a request's detail page.

---

## Routing

The admin screens use real routes, so the detail page can be linked and survives a refresh. They are handled inside `AppShell` (`src/App.tsx`), after the sign-in and onboarding gates, with `useMatch`:

```
1. !isAuthenticated                       → Login / guest form
2. !user.profileComplete                  → OnboardingForm
3. /admin/requests[/:id] && !isAdmin      → redirect to /
4. /admin/requests/:id && isAdmin         → AdminRequestDetail
5. /admin/requests && isAdmin             → AdminRequestList
6. currentPage state (profile/track/map)  → existing screens
```

The redirect is a courtesy: the API enforces the role on `PATCH` and scopes `GET` itself.

**Known limit:** opening an admin URL while signed out sends the person through Google sign-in, which returns to `/` (`AuthCallback`), so the path is lost.

---

## List — `AdminRequestList`

- Loads everything with `getServiceRequests()` (all pages) and filters on the client.
- Summary strip with a count per status (all five, including *Closed*); clicking one filters by it.
- Search across reference number, category label, address, neighbourhood and reporter name. Selects for category, severity (including *Not assessed*) and status. "Clear filters" appears when any is active.
- Newest first. Each row: category icon, reference, status badge, severity (or *Not assessed*), category, address, reporter, date. The whole row opens the detail page.
- States: loading, error with retry (does not refetch on a language change), empty ("no requests yet") and "no match".

## Detail — `AdminRequestDetail`

Loads `GET /service-requests/{id}` (`getServiceRequest`).

| Area | Content |
|---|---|
| Header | Category icon and name, reference number, current status badge |
| Issue | Description, severity (or *Not assessed*), site type, submitted date, date of last status change |
| Location | Address, location notes, a Google Map with a pin (same loader id as `RequestMap` and `LocationPicker`). Without coordinates, or without a Maps key, a message instead |
| Photo | `imageUrl` in an `<img>` (opens full size in a new tab). The link expires after 15 minutes: if the image fails to load, a message asks to reload the page |
| Status | Select with all five statuses, optional note (max 1000 characters), **Save** |
| Severity | Select with Low, Medium and High, optional note (max 1000 characters), **Save**. See *Assessing severity* |
| Reporter | Name, email, phone, verified mobile (anonymous submissions), whether they signed in, whether they want updates |
| History | Newest first: a status or a severity change, date and time, who changed it, note |

### Changing the status

- Any status can be set from any other.
- **Save** is disabled while saving, or while the status is unchanged and the note is empty. Keeping the same status with a note logs a comment (the API accepts this).
- On success the screen replaces its data with the `PATCH` response (so the badge, last-change date and history update at once) and shows "Status updated.".
- On failure the API's `message` is shown under the form; the form keeps what was typed.
- States: loading, not found (404), no access (401/403), other errors.

### Assessing severity

Citizens do not choose a severity when they submit. A request has none until an administrator sets it; until then it reads **Not assessed** everywhere (list rows, the severity filter, the Issue card). Requests created before this change keep the severity their submitter picked.

- The select offers Low, Medium and High. While the request is unassessed it also shows a disabled *Not assessed* placeholder; once assessed, a request cannot go back to it.
- **Save** is disabled while saving or while no different severity is chosen (a note alone cannot be saved). It calls `PATCH /service-requests/{id}/severity` (`updateServiceRequestSeverity`).
- On success the screen replaces its data with the response (the Issue card and History update at once) and shows "Severity updated.". On failure the API's `message` is shown under the form and the form keeps what was typed.
- The status and severity forms are independent: each has its own note and its own saving, error and success state.
- History entries for severity changes read "Severity set to High" and show the severity's colour dot instead of a status badge.

---

## Files

| File | Role |
|---|---|
| `src/components/AdminRequestList.tsx` | List screen |
| `src/components/AdminRequestDetail.tsx` | Detail screen and status form |
| `src/components/requestUi.tsx` | `Status`, `STATUS_ORDER`, `STATUS_CONFIG`, `Severity`, `SEVERITY_ORDER`, `toSeverity`, `CATEGORY_ICONS`, `StatusBadge`, `toStatus`; shared with `TrackRequests` and `RequestMap` |
| `src/services/ServiceRequestService.ts` | `getServiceRequest`, `updateServiceRequestStatus`, `updateServiceRequestSeverity`, `ServiceRequestDetail`, `StatusChange` |
| `src/components/SiteHeader.tsx` | `onManageClick` button (admins) |
| `src/i18n/locales/*.json` | `admin.*`, `header.manage_requests*`, `map.open_details` |

## Not included

- Assigning a request to a team or person.
- Emails to the reporter when the status changes (`receiveUpdates` is stored but nothing is sent).
- Server-side filtering and paging for the list. Fine for hundreds of requests; revisit if volume grows.
- Editing a request's other fields.
- A *Not assessed* count in the list's summary strip, and changing severity from the list.
- Telling the reporter when severity changes.
