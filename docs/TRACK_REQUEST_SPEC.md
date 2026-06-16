# Track Your Requests — Design Specification

**Version:** 1.0  
**Last Updated:** June 16, 2026  
**Design System:** Civic Editorial  
**Depends on:** `SERVICE_REQUEST_FORM_SPEC.md`, `AUTHENTICATION_SYSTEM_SPEC.md`

---

## Overview

A read-only dashboard page that lets authenticated citizens view all service requests submitted under their account. Displays reference number, category, status and submission date. Accessible from the form header and from the post-submission success screen.

### Key Features
- Status summary strip with one-click filtering
- Combined text search (reference number, category, suburb)
- Status dropdown filter
- Chronological sort (newest first)
- Civic/institutional aesthetic consistent with the parent form
- Empty state with clear-filter action
- Contextual footer note scoped to the authenticated user's email

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── App.tsx                          # Page router — adds "track" page type
│   ├── ServiceRequestForm.tsx           # Receives onTrackClick prop; header + success CTAs
│   └── components/
│       └── TrackRequests.tsx            # Track page (self-contained, full-page)
```

### Component Hierarchy

```
App (AuthProvider wrapper)
└── AppContent
    ├── Login          (if !isAuthenticated)
    ├── Profile        (if currentPage === "profile")
    ├── TrackRequests  (if currentPage === "track")
    └── ServiceRequestForm (if currentPage === "form")
        ├── Header → "Track Requests" nav button
        └── SuccessScreen → "Track Your Requests" CTA button
```

### Page Type Extension

`App.tsx` uses a discriminated union for page routing:

```typescript
type Page = "form" | "profile" | "track";
```

---

## Navigation — Entry Points

Two entry points exist in the current implementation. A third is recommended.

### 1. Header Nav Link (Primary)

**Location:** `ServiceRequestForm.tsx` — right side of the site header, between the date block and the profile avatar button.

**Visibility:** Desktop only (`hidden md:inline-flex`). Hidden on mobile to keep the header uncluttered; on small screens users reach the page via the success screen CTA.

**Styling:**

```
px-3 py-2.5  rounded-sm
bg-primary-foreground/10  hover:bg-primary-foreground/20
border border-primary-foreground/20
text-sm text-primary-foreground/80  hover:text-primary-foreground
transition-colors
```

**Label:** `Track Requests`

**Rationale:** Persistent and accessible from any form step without disrupting the in-progress workflow. Serves returning users who want to check status before starting a new submission.

### 2. Success Screen CTA (Contextual)

**Location:** `ServiceRequestForm.tsx` — `SuccessScreen` component, action button row.

**Position:** Second button, replacing the earlier "Return to Council Website" placeholder.

**Styling:** Matches the secondary outline button style used across the form:

```
px-6 py-2.5  border border-border  rounded-sm
text-sm font-medium text-foreground
hover:bg-muted/60  transition-colors
```

**Label:** `Track Your Requests`

**Rationale:** Highest-intent entry point. The user has just submitted and naturally wants to verify the request appears in their list.

### 3. Profile Page (Recommended — Not Yet Implemented)

A summary of recent requests (latest 3, with a "View all" link) would make the profile page a hub for all account-related activity rather than just identity info. Recommended for a future iteration.

---

## Data Model

### Request Interface

```typescript
interface Request {
  referenceNumber: string;  // e.g. "SR-2026-84231"
  category: string;         // internal key e.g. "pothole"
  categoryLabel: string;    // display label e.g. "Pothole / Road Damage"
  status: Status;
  createdAt: Date;
  address: string;
  suburb: string;
}

type Status =
  | "received"
  | "under_review"
  | "in_progress"
  | "resolved"
  | "closed";
```

### Status Configuration

| Status key    | Display label  | Dot colour  | Pill colours                          |
|---------------|---------------|-------------|---------------------------------------|
| `received`    | Received       | sky-400     | bg-sky-50 / border-sky-200 / text-sky-800 |
| `under_review`| Under Review   | violet-400  | bg-violet-50 / border-violet-200 / text-violet-800 |
| `in_progress` | In Progress    | amber-400   | bg-amber-50 / border-amber-200 / text-amber-800 |
| `resolved`    | Resolved       | emerald-500 | bg-emerald-50 / border-emerald-200 / text-emerald-800 |
| `closed`      | Closed         | neutral-400 | bg-neutral-100 / border-neutral-200 / text-neutral-600 |

### Category → Icon Mapping

| Category key | Icon (lucide-react) |
|---|---|
| `pothole` | `HardHat` |
| `graffiti` | `Paintbrush` |
| `broken` | `Wrench` |
| `flooding` | `Droplets` |
| `lighting` | `Zap` |
| `trees` | `Leaf` |
| `dumping` | `Trash2` |
| `other` | `Building2` |

### Mock Data Seed

Five requests spanning a variety of statuses and categories are seeded for prototype purposes. In production these would be fetched from the backend filtered by the authenticated user's account.

```typescript
const MOCK_REQUESTS: Request[] = [
  { referenceNumber: "SR-2026-84231", category: "pothole",  status: "in_progress",  createdAt: new Date("2026-06-10"), ... },
  { referenceNumber: "SR-2026-71059", category: "lighting", status: "under_review", createdAt: new Date("2026-06-05"), ... },
  { referenceNumber: "SR-2026-63388", category: "graffiti", status: "resolved",     createdAt: new Date("2026-05-22"), ... },
  { referenceNumber: "SR-2026-50014", category: "trees",    status: "closed",       createdAt: new Date("2026-05-01"), ... },
  { referenceNumber: "SR-2026-44892", category: "dumping",  status: "received",     createdAt: new Date("2026-06-15"), ... },
];
```

---

## Component: TrackRequests

**File:** `src/app/components/TrackRequests.tsx`

### Props

```typescript
interface TrackRequestsProps {
  user: User | null;      // Authenticated user from AuthContext
  onBack: () => void;     // Navigate back to the form ("form" page)
  onProfileClick: () => void; // Navigate to profile page
}
```

### State

```typescript
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
```

### Filtering Logic

```typescript
const filtered = MOCK_REQUESTS
  .filter((r) => {
    const matchSearch =
      search === "" ||
      r.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.categoryLabel.toLowerCase().includes(search.toLowerCase()) ||
      r.suburb.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  })
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

---

## Layout Structure

### Header

Identical to `ServiceRequestForm` header. Contains:
- Left: Wrench icon + "City Council / Public Works & Infrastructure" wordmark
- Right: Date block (desktop) + profile avatar button

The Track page does **not** show the "Track Requests" nav link in its own header (no circular self-reference).

### Page Heading

```
← Back to Submit a Request      ← ghost button, ArrowLeft icon, mb-4
Track Your Requests              ← font-display, 3xl, bold
View and monitor all service requests submitted under your account.
```

### Status Summary Strip

Four clickable metric cards in a `grid-cols-2 sm:grid-cols-4` layout. Covers `received`, `under_review`, `in_progress`, `resolved` (excludes `closed` — treated as terminal/archive).

**Card (inactive):**
```
border border-border  bg-card  rounded-sm  p-3.5
hover:border-primary/30  transition-all
```

**Card (active — matching current filter):**
```
border-primary  bg-primary/5
```

**Card internals:**
```
Status label  → xs font-mono uppercase tracking-widest  [status text colour]
Count         → 2xl font-display font-bold text-foreground
```

Clicking an active card resets the filter to `"all"`. Clicking an inactive card sets it as the active filter.

### Search + Filter Bar

```
flex-col sm:flex-row  gap-3  mb-4
```

**Search input:**
- `pl-9` to accommodate the `Search` icon at `left-3`
- Placeholder: `Search by reference number, category or suburb…`
- Focus ring: `ring-2 ring-primary/30 border-primary`

**Status select:**
- Options: All Statuses + each `Status` in `STATUS_ORDER` array order
- Same height and border style as the search input

### Results Count Label

```
text-xs font-mono text-muted-foreground uppercase tracking-widest  mb-2
```

Format: `{n} request(s)` — appends `· {Status label}` when a status filter is active.

### Request List

A `border border-border rounded-sm bg-card` container. Each row is a `RequestRow` component separated by `border-b border-border last:border-0`.

**RequestRow layout:** `grid grid-cols-[auto_1fr_auto]` with `gap-4 items-center px-5 py-4`

**Column 1 — Category icon:**
```
w-9 h-9  rounded-sm  bg-primary/8
flex items-center justify-center  flex-shrink-0
Icon: w-4 h-4 text-primary/60
```

**Column 2 — Content (min-w-0 for truncation):**

Row 1: Reference number (font-mono xs text-muted-foreground) + StatusBadge inline-flex  
Row 2: Category label (text-sm font-medium text-foreground, truncate)  
Row 3: Address, Suburb · Submitted {date} (text-xs text-muted-foreground, truncate)

Date format: `en-AU` locale — e.g. `10 Jun 2026`

**Column 3 — ChevronRight:**
```
w-4 h-4 text-muted-foreground/40
group-hover:text-muted-foreground  transition-colors  flex-shrink-0
```

Row hover: `hover:bg-primary/[0.025] transition-colors group cursor-pointer`

### StatusBadge Sub-component

```typescript
function StatusBadge({ status }: { status: Status })
```

```
inline-flex items-center gap-1.5  px-2.5 py-1  rounded-sm
text-xs font-mono
[pill class from STATUS_CONFIG]  [text class from STATUS_CONFIG]

  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 [dot class]" />
  {label}
```

### Empty State

Shown when `filtered.length === 0`:

```
py-16 text-center
RefreshCw icon: w-8 h-8 text-muted-foreground/30 mx-auto mb-3
"No requests match your search."  text-sm text-muted-foreground
"Clear filters" underline button  → resets search and statusFilter
```

### Footer Note

```
mt-4 text-xs text-muted-foreground/60 font-mono
```

> Showing requests linked to {user.email}. Status updates are typically reflected within one business day.

---

## Integration Checklist

When porting this component to another project:

1. **Design tokens** — Import the Civic Editorial token set (see `SERVICE_REQUEST_FORM_SPEC.md §Design Tokens`). The component uses `bg-background`, `bg-card`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary-foreground`, and `bg-accent`.
2. **Typography** — Requires `font-display` (Fraunces), `font-sans` (Plus Jakarta Sans), `font-mono` (DM Mono).
3. **Auth context** — Requires a `User` object with `{ name, email, photo }`. Replace the `user` prop source as needed.
4. **Icons** — Uses `lucide-react`: `ArrowLeft`, `Search`, `Clock`, `CheckCircle2`, `AlertCircle`, `Wrench`, `ChevronRight`, `FileText`, `RefreshCw`, `HardHat`, `Paintbrush`, `Droplets`, `Zap`, `Leaf`, `Trash2`, `Building2`.
5. **Data source** — Replace `MOCK_REQUESTS` with an API call filtered by the authenticated user's ID or email. The `Request` interface and `Status` union type are the only structural dependency.
6. **Navigation** — `onBack` and `onProfileClick` are simple callbacks; swap for router navigation (`useNavigate`, `<Link>`, etc.) as needed.
7. **Header** — The header block is duplicated from `ServiceRequestForm`. In a production app extract it into a shared `<SiteHeader>` component to eliminate duplication.

---

## Future Considerations

| Feature | Notes |
|---|---|
| Request detail view | Click a row → expand or navigate to a detail page showing full description, photos, timeline, and council notes |
| Profile page summary | Embed the 3 most recent requests on the Profile page with a "View all" link |
| Pagination | Add when the list exceeds ~20 items |
| Real-time status polling | Poll the backend on an interval or use WebSockets to update status badges live |
| Mobile "Track Requests" entry | Add a bottom action bar or hamburger menu item for mobile access (currently desktop-header only) |
| Empty account state | Distinct empty state for users who have never submitted a request, with a CTA to submit their first |
