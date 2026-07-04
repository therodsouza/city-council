# Request Map — Design Specification

**Version:** 1.0  
**Last Updated:** June 17, 2026  
**Design System:** Civic Editorial  
**Access:** Administrator only  
**Depends on:** `SERVICE_REQUEST_FORM_SPEC.md`, `AUTHENTICATION_SYSTEM_SPEC.md`, `ONBOARDING_SPEC.md`

---

## Overview

A full-page map view available exclusively to administrator users. Displays all submitted service requests as colour-coded pins on a map, with status filtering, a collapsible legend, and a detail panel that opens on pin selection. Designed as a container ready to receive a real Google Maps integration once an API key is available.

### Key Features
- Admin-only access — button and page are invisible to citizen users
- Colour-coded pins by request status with hover and selected states
- Clickable detail panel showing reference number, category, address, date, and status
- Status filter chips in the toolbar (excluding "Closed")
- Collapsible legend with per-status request counts
- Map container architected for drop-in Google Maps API replacement
- Civic aesthetic consistent with the rest of the portal

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── App.tsx                        # Adds "map" page branch; guards with user.isAdmin
│   ├── ServiceRequestForm.tsx         # Receives onMapClick prop; renders Map button for admins
│   ├── contexts/
│   │   └── AuthContext.tsx            # Adds isAdmin: boolean to User; adds loginAsAdmin()
│   └── components/
│       ├── Login.tsx                  # Adds "Sign in as Administrator (demo)" button
│       └── RequestMap.tsx             # Map page — self-contained, full-page
```

### Routing / Gate Order

The `"map"` branch in `AppContent` checks `user.isAdmin` independently of the header button, preventing navigation to the map page by any means other than being an admin:

```typescript
if (currentPage === "map" && user?.isAdmin) {
  return <RequestMap ... />;
}
```

Full gate order in `AppContent`:

```
1. !isAuthenticated            → <Login />
2. !user.profileComplete       → <OnboardingForm />
3. currentPage === "profile"   → <Profile />
4. currentPage === "track"     → <TrackRequests />
5. currentPage === "map"
   && user.isAdmin             → <RequestMap />
6. default                     → <ServiceRequestForm />
```

### Page Type Extension

```typescript
type Page = "form" | "profile" | "track" | "map";
```

---

## Auth Context Changes

### User Interface

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  profileComplete: boolean;
  profile: UserProfile | null;
  isAdmin: boolean;            // NEW
}
```

### loginAsAdmin()

A second mock login function that creates a pre-complete admin account, bypassing the onboarding gate:

```typescript
const loginAsAdmin = () => {
  setUser({
    id: "mock-admin-001",
    name: "Admin User",
    email: "admin@council.gov.au",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    profileComplete: true,
    profile: null,
    isAdmin: true,
  });
};
```

Admin accounts skip onboarding (`profileComplete: true`) because administrators are provisioned by the council IT team, not through the citizen self-registration flow.

In production, `isAdmin` would be derived from a role claim in the OAuth ID token or from a server-side permissions check — never set client-side.

---

## Data Model

### MapRequest Interface

Extends the base `Request` type (see `TRACK_REQUESTS_SPEC.md`) with geocoordinates:

```typescript
interface MapRequest {
  referenceNumber: string;
  category: string;
  categoryLabel: string;
  status: Status;
  createdAt: Date;
  address: string;
  suburb: string;
  lat: number;   // WGS-84 latitude
  lng: number;   // WGS-84 longitude
}
```

Coordinates should be resolved at form submission time via server-side geocoding (e.g. Google Geocoding API) using the submitted address fields, then stored alongside the request record. They must not be computed client-side.

### Mock Dataset

Eight requests seeded across inner-west Sydney (bounding box approximately -33.915 to -33.878 lat, 151.150 to 151.190 lng), covering all five statuses and six categories.

### Status Configuration

Identical to `TRACK_REQUESTS_SPEC.md §Status Configuration`, with one addition — a `pin` colour used for map markers:

| Status key    | Pin colour    | Label         |
|---------------|---------------|---------------|
| `received`    | `bg-sky-500`     | Received      |
| `under_review`| `bg-violet-500`  | Under Review  |
| `in_progress` | `bg-amber-500`   | In Progress   |
| `resolved`    | `bg-emerald-500` | Resolved      |
| `closed`      | `bg-neutral-400` | Closed        |

---

## Component: RequestMap

**File:** `src/app/components/RequestMap.tsx`

### Props

```typescript
interface RequestMapProps {
  user: User | null;
  onBack: () => void;
  onProfileClick: () => void;
}
```

### State

```typescript
const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
const [selected, setSelected]         = useState<MapRequest | null>(null);
const [showLegend, setShowLegend]     = useState(true);
```

### Filtering

```typescript
const visible = ALL_REQUESTS.filter(
  (r) => statusFilter === "all" || r.status === statusFilter
);
```

Clicking an active filter chip resets to `"all"`. The toolbar count label reflects the filtered total: `{visible.length} of {ALL_REQUESTS.length} requests`.

---

## Layout Structure

The page uses a `flex flex-col min-h-screen` root to let the map area fill remaining height.

### Header

Standard site header (`bg-primary`). Right side:

- Date block (desktop, shows "Admin Console" label instead of "Online Services")
- Profile avatar button

The "Track Requests" and "Request Map" nav links are **not** repeated inside the map page header — the toolbar back button handles navigation.

### Toolbar

`bg-card border-b border-border` strip below the header. Two groups:

**Left group:**
- `← Back` ghost button → `onBack()`
- Vertical divider `w-px h-4 bg-border`
- `font-display text-lg font-bold` page title "Request Map"
- Request count badge `text-xs font-mono bg-muted px-2 py-0.5 rounded-sm` (desktop only)

**Right group:**
- `Filter` icon (3.5×3.5, muted)
- Status filter chip row (see below)
- Legend toggle button — `Layers` icon, `border border-border rounded-sm p-1.5`

#### Status Filter Chips

Chips for "All" plus the four active statuses (`received`, `under_review`, `in_progress`, `resolved`). "Closed" is intentionally excluded — closed requests are considered archived and not operationally relevant on the map.

**Inactive chip:**
```
px-2.5 py-1 rounded-sm text-xs font-mono
bg-muted text-muted-foreground hover:text-foreground
```

**Active chip — "All":**
```
bg-primary text-primary-foreground
```

**Active chip — status:**
```
border [pill class from STATUS_CONFIG] [text class from STATUS_CONFIG]
```

### Map Container

```
flex-1 relative overflow-hidden  (min-height: 520px)
```

The inner `absolute inset-0` div is the **Google Maps mount point**. In the prototype it contains:
- SVG grid texture (opacity 30%)
- SVG road/park overlay (opacity 40%)
- "Google Maps — API key required" watermark badge
- Pin layer
- Detail panel (conditional)
- Legend (conditional)

**Google Maps integration comment** (present in source):
> Replace the contents of this div with a `<GoogleMap>` component from `@react-google-maps/api` once an API key is available. The pin layer below can be rendered as `<OverlayView>` children on the real map.

---

## Sub-components

### Pin

Renders an absolutely-positioned map pin for a single request.

```typescript
function Pin({
  req,
  selected,
  onClick,
}: {
  req: MapRequest;
  selected: boolean;
  onClick: () => void;
})
```

**Coordinate mapping (prototype only):**

Lat/lng are converted to CSS percentage offsets within the bounding box of the demo dataset:

```typescript
function toPercent(val: number, min: number, max: number) {
  return ((val - min) / (max - min)) * 100;
}

const left = toPercent(req.lng, LNG_MIN, LNG_MAX);
const top  = 100 - toPercent(req.lat, LAT_MIN, LAT_MAX); // inverted: CSS top-0 = north
```

`LNG_MIN = 151.150`, `LNG_MAX = 151.190`, `LAT_MIN = -33.915`, `LAT_MAX = -33.878`.

Replace with `<OverlayView position={{ lat, lng }}>` in the real Google Maps integration.

**Pin anatomy:**

```
<button> absolute -translate-x-1/2 -translate-y-full  (anchor bottom-centre to coordinate)
  <div> transition-transform — scale-125 when selected, hover:scale-110 otherwise
    Circle:  w-7 h-7 rounded-full shadow-md border-2
             border-foreground (selected) | border-white (idle)
             [pin colour from STATUS_CONFIG]
      MapPin icon: w-3.5 h-3.5 text-white
    Stem:  w-0.5 h-2 [pin colour] mx-auto
```

### DetailPanel

Appears when a pin is selected. Dismissed by clicking X, or by clicking the same pin again.

```typescript
function DetailPanel({ req, onClose }: { req: MapRequest; onClose: () => void })
```

**Position:** `absolute bottom-4 right-4` (full-width on mobile: `left-4 right-4 sm:left-auto sm:w-72`).

**Structure:**

```
bg-card border border-border rounded-sm shadow-lg z-20

  Header row (p-4 border-b):
    Category icon container (w-8 h-8 bg-primary/8 rounded-sm)
    Reference number  → text-xs font-mono text-muted-foreground
    Category label    → text-sm font-semibold text-foreground
    × close button    → p-1 rounded-sm hover:bg-muted/60

  Body (p-4 space-y-2.5):
    Location block:
      "Location" label (xs font-mono uppercase tracking-widest)
      Address         (text-foreground font-medium)
      Suburb          (text-muted-foreground text-xs)
    Bottom row (flex justify-between):
      Submitted block:
        "Submitted" label
        Date in en-AU locale (e.g. "10 Jun 2026")
      StatusDot badge
```

### StatusDot

Inline status badge used inside the detail panel:

```typescript
function StatusDot({ status }: { status: Status })
```

```
inline-flex items-center gap-1.5  px-2 py-0.5  rounded-sm  text-xs font-mono  border
[pill class] [text class] from STATUS_CONFIG
  <span w-1.5 h-1.5 rounded-full [dot class]>
  {label}
```

### Legend

Conditionally rendered via `showLegend` state. Toggled by the `Layers` button in the toolbar.

```
absolute top-4 right-4  bg-card border border-border rounded-sm p-3 shadow-md z-20
min-w-[160px]

"Legend" heading: text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2

For each status in STATUS_ORDER:
  flex items-center gap-2
    Dot: w-3.5 h-3.5 rounded-full [pin colour] border border-white shadow-sm
    Label: text-xs text-foreground
    Count: text-xs text-muted-foreground ml-auto
```

---

## Header Button: ServiceRequestForm

**File:** `src/app/ServiceRequestForm.tsx`

### Prop addition

```typescript
{ user, onProfileClick, onTrackClick, onMapClick }
// onMapClick: () => void  — NEW
```

### Local User type extension

```typescript
interface User {
  ...
  isAdmin?: boolean;   // NEW
}
```

### Button

Rendered only when `user?.isAdmin === true`. Placed after the "Track Requests" button, before the profile avatar.

```tsx
{user?.isAdmin && (
  <button
    type="button"
    onClick={onMapClick}
    className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-sm
               bg-accent/80 hover:bg-accent transition-colors border border-accent
               text-sm text-white"
    title="Request Map (Admin)"
  >
    <Map className="w-4 h-4" />
    Request Map
  </button>
)}
```

Styled in amber (`bg-accent`) to visually distinguish it from the ghost-style citizen nav links. Desktop-only (`hidden md:inline-flex`).

---

## Login Page Changes

**File:** `src/app/components/Login.tsx`

A secondary button added inside the sign-in card, below the Google button, separated by a top border:

```tsx
<button onClick={loginAsAdmin}>
  <Shield className="w-4 h-4" />
  Sign in as Administrator (demo)
</button>
```

**Styling:**

```
w-full flex items-center justify-center gap-2  px-6 py-2.5
border border-border rounded-sm text-sm text-muted-foreground
hover:bg-muted/30 hover:text-foreground transition-colors
```

This button is a prototype convenience only. Remove before production.

---

## Google Maps Integration Guide

When an API key is available, replace the prototype map container with:

```tsx
import { GoogleMap, OverlayView, useJsApiLoader } from "@react-google-maps/api";

const { isLoaded } = useJsApiLoader({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY });

// Replace the prototype <div className="absolute inset-0 bg-[#e8e0d8]"> with:
<GoogleMap
  mapContainerClassName="absolute inset-0"
  center={{ lat: -33.897, lng: 151.170 }}   // inner-west Sydney centroid
  zoom={14}
  options={{
    disableDefaultUI: true,
    zoomControl: true,
    styles: CIVIC_MAP_STYLES,               // see note below
  }}
>
  {visible.map((req) => (
    <OverlayView
      key={req.referenceNumber}
      position={{ lat: req.lat, lng: req.lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <Pin req={req} selected={...} onClick={...} />
    </OverlayView>
  ))}
</GoogleMap>
```

**Map styling:** Apply a custom `CIVIC_MAP_STYLES` array to desaturate the Google base tiles toward the warm parchment palette (`#F2F0EB` background, muted road colours). A suitable starting point is the "Silver" or "Subtle Grayscale" style from the Google Maps Styling Wizard, with hue shifted toward warm grey.

**Coordinate storage:** Geocode submitted addresses server-side at form submission time using the Google Geocoding API. Store `lat` and `lng` alongside the request record. Never geocode client-side — it exposes the API key and adds latency to the submission flow.

**API key security:** Load the key from an environment variable (`GOOGLE_MAPS_API_KEY`). Restrict it in the Google Cloud Console to the production domain and the Maps JavaScript API only.

---

## Integration Checklist

When porting this component to another project:

1. **Auth guard** — Ensure `isAdmin` is derived from a server-side role claim, not set client-side. Check it in both the router branch and the header button render condition.
2. **Design tokens** — Requires the Civic Editorial token set. Uses `bg-background`, `bg-card`, `bg-primary`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary-foreground`.
3. **Icons** — `lucide-react`: `ArrowLeft`, `Wrench`, `MapPin`, `Map`, `HardHat`, `Paintbrush`, `Droplets`, `Zap`, `Leaf`, `Trash2`, `Building2`, `X`, `Layers`, `Filter`, `Shield`.
4. **Coordinate data** — Replace `ALL_REQUESTS` mock with an API call returning `MapRequest[]`. Ensure `lat` and `lng` are populated at submission time via server-side geocoding.
5. **Google Maps** — Install `@react-google-maps/api`, provision an API key, apply domain restrictions, and follow the integration guide above.
6. **Map styles** — Create a `CIVIC_MAP_STYLES` array matching the Civic Editorial palette before going to production.
7. **Remove demo login** — Delete the `loginAsAdmin()` function and its button from `Login.tsx`. Admin authentication should flow through the same Google OAuth path with role provisioning handled server-side.
8. **Status filter for closed** — "Closed" is currently excluded from the toolbar chips. Revisit this if operational requirements change (e.g. auditing or historical analysis use cases).

---

## Future Considerations

| Feature | Notes |
|---|---|
| Clustering | Group overlapping pins into a count cluster at low zoom levels using `@react-google-maps/api` MarkerClusterer or a custom `OverlayView` cluster component |
| Heatmap layer | Toggle between pin view and a density heatmap (Google Maps `HeatmapLayer`) for high-level area prioritisation |
| Satellite / street toggle | Add a map type control for satellite and street-view modes |
| Draw area filter | Let admins draw a polygon to filter requests within a specific zone |
| Mobile toolbar | The filter chips collapse off-screen on mobile; replace with a bottom sheet or drawer on small viewports |
| Direct URL / deep link | Support `?request=SR-2026-84231` query param to open the map with a specific pin pre-selected |
| Admin detail actions | Extend the detail panel with admin actions: assign to a team, update status, add a note |
