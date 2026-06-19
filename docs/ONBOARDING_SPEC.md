# User Onboarding — Design Specification

**Version:** 1.0  
**Last Updated:** June 17, 2026  
**Design System:** Civic Editorial  
**Depends on:** `AUTHENTICATION_SYSTEM_SPEC.md`, `SERVICE_REQUEST_FORM_SPEC.md`

---

## Overview

A hard-gated onboarding step presented to new users immediately after their first Google sign-in. Collects supplementary identity information — date of birth, gender, and residential address — before granting access to the portal. Once submitted, the gate never reappears.

### Key Features
- Hard gate — portal is inaccessible until onboarding is complete
- Single-page form, no wizard (low field count doesn't warrant multi-step)
- Client-side field validation with inline error messages
- Brief confirmation state before handing off to the main app
- 3-step progress breadcrumb contextualising the user's position in the sign-up flow
- Civic aesthetic consistent with the parent application

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── App.tsx                        # Gate logic — onboarding check between login and portal
│   ├── contexts/
│   │   └── AuthContext.tsx            # UserProfile type, profileComplete flag, completeProfile()
│   └── components/
│       ├── OnboardingForm.tsx         # Onboarding page (self-contained, full-page)
│       └── Profile.tsx                # Updated — renders Personal Details section from profile data
```

### Routing / Gate Order

`AppContent` in `App.tsx` evaluates three conditions in sequence:

```
1. !isAuthenticated          → <Login />
2. !user.profileComplete     → <OnboardingForm />
3. currentPage === "profile" → <Profile />
4. currentPage === "track"   → <TrackRequests />
5. default                   → <ServiceRequestForm />
```

The onboarding gate (condition 2) sits between authentication and all portal pages. No page in the portal is reachable until `user.profileComplete === true`.

---

## Data Model

### UserProfile Interface

```typescript
interface UserProfile {
  dateOfBirth: string;  // ISO date string, e.g. "1990-04-15"
  gender: string;       // Selected option from GENDER_OPTIONS
  address: string;      // Street address
  suburb: string;
  postcode: string;     // Optional, 4-digit Australian postcode
}
```

### User Interface Extension

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  profileComplete: boolean;   // false for all new accounts
  profile: UserProfile | null;
}
```

New accounts are created with `profileComplete: false` and `profile: null`. Both fields are set by `completeProfile()`.

### AuthContext Addition

```typescript
interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  completeProfile: (profile: UserProfile) => void;  // NEW
  isAuthenticated: boolean;
}
```

`completeProfile` is a pure context updater — it merges the submitted `UserProfile` into the existing user object and sets `profileComplete: true`:

```typescript
const completeProfile = (profile: UserProfile) => {
  setUser((prev) => prev ? { ...prev, profileComplete: true, profile } : prev);
};
```

In a production integration this function would also persist the profile to the backend before updating local state.

---

## Component: OnboardingForm

**File:** `src/app/components/OnboardingForm.tsx`

### Props

None. Reads `user` and `completeProfile` directly from `useAuth()`.

### State

```typescript
const [form, setForm] = useState<UserProfile>({
  dateOfBirth: "",
  gender: "",
  address: "",
  suburb: "",
  postcode: "",
});
const [errors, setErrors] = useState<FieldError>({});
const [submitted, setSubmitted] = useState(false);
```

### Validation

Runs on submit. All errors are displayed simultaneously (not sequentially).

```typescript
interface FieldError {
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
}
```

| Field | Rule | Error message |
|---|---|---|
| `dateOfBirth` | Required | "Date of birth is required." |
| `dateOfBirth` | Age ≥ 16 | "You must be at least 16 years old." |
| `dateOfBirth` | Age ≤ 120 | "Enter a valid date of birth." |
| `gender` | Required | "Please select an option." |
| `address` | Required (non-empty after trim) | "Street address is required." |
| `suburb` | Required (non-empty after trim) | "Suburb is required." |
| `postcode` | Optional; if provided must match `/^\d{4}$/` | "Postcode must be 4 digits." |

Age calculation accounts for whether the birthday has passed in the current year:

```typescript
const age = today.getFullYear() - dob.getFullYear() -
  (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
```

### Submit Flow

```
1. Validate — if errors, set error state and abort
2. setSubmitted(true) — show confirmation screen immediately
3. setTimeout(completeProfile, 800) — brief pause for user to read confirmation
4. AuthContext updates user, AppContent re-renders, gate lifts
```

The 800 ms delay is intentional UX — it gives the user a moment to read "Profile Complete / Taking you to the portal…" before the screen transitions.

### Gender Options

```typescript
const GENDER_OPTIONS = [
  "Man",
  "Woman",
  "Non-binary",
  "Prefer not to say",
  "Other",
];
```

---

## Layout Structure

### Header

Identical to all other portal page headers. Contains:
- Left: Wrench icon + "City Council / Public Works & Infrastructure" wordmark
- Right: User avatar + name (display-only, no profile link — the user hasn't completed onboarding yet)

### Page Heading Block

```
"New Account"   → text-xs font-mono uppercase tracking-widest text-accent  mb-2
"Complete Your Profile"  → font-display 3xl bold
Body copy: "Before accessing the portal, we need a few more details. This information
helps us verify your eligibility and process requests accurately."
```

### Progress Breadcrumb

Three steps rendered inline with `ChevronRight` separators:

| Step | State | Circle style | Label style |
|---|---|---|---|
| 1 — Google Sign-In | Done | `bg-primary` + checkmark | `text-muted-foreground font-mono xs` |
| 2 — Profile Details | Active | `bg-accent` + "2" | `text-foreground font-medium font-mono xs` |
| 3 — Portal Access | Pending | `border border-border bg-card` + "3" | `text-muted-foreground font-mono xs` |

### Form Card

```
bg-card  border border-border  rounded-sm  overflow-hidden
```

Split into two internal sections separated by `border-b border-border`:

#### Section 1 — Personal Information

Section header:
```
User icon (w-4 h-4 text-primary/60) + "Personal Information" (xs font-mono uppercase tracking-widest text-muted-foreground)
```

Fields: Date of Birth, Gender.

#### Section 2 — Residential Address

Section header:
```
MapPin icon + "Residential Address"
```

Fields: Street Address (full width), then a `grid-cols-2 gap-4` row for Suburb and Postcode.

### Field Component

Reusable `<Field>` wrapper used for all inputs:

```typescript
function Field({
  label,
  hint?,
  error?,
  required?,
  children,
}: { ... })
```

- Label: `text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5`
- Required marker: `text-accent ml-1` asterisk appended to label
- Hint (optional): `text-xs text-muted-foreground/70 mb-1.5`, shown below label
- Error: `flex items-center gap-1.5 text-xs text-destructive mt-1.5` with `AlertCircle` icon

### Input Styling

Base class shared across all inputs and the select:

```
w-full px-3 py-2.5 border rounded-sm bg-white text-sm text-foreground
placeholder:text-muted-foreground/50
focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
transition-colors
```

State variants:

| State | Border | Ring |
|---|---|---|
| Normal | `border-border` | `ring-primary/30` |
| Error | `border-destructive` | `ring-destructive/20 focus:border-destructive` |

Date input: `pl-9` to accommodate the `Calendar` icon absolutely positioned at `left-3`.

### Privacy Note

Below the card, above the submit button:

```
text-xs text-muted-foreground/70 font-mono leading-relaxed
```

> Your information is stored securely and used solely for council service purposes. See our Privacy Policy for details.

### Submit Button

```
w-full py-3  bg-primary text-primary-foreground  text-sm font-semibold  rounded-sm
hover:bg-primary/90  transition-colors
flex items-center justify-center gap-2
```

Label: `Continue to Portal` + `ChevronRight` icon (w-4 h-4).

### Confirmation State

Replaces the form when `submitted === true`:

```
bg-card border border-border rounded-sm p-8 text-center
```

- Circle: `w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200` + checkmark emoji
- Heading: `font-display text-xl font-bold` — "Profile Complete"
- Body: `text-sm text-muted-foreground` — "Taking you to the portal…"

---

## Profile Page Integration

**File:** `src/app/components/Profile.tsx`

The Profile page gains a **Personal Details** section between "Account Information" and the sign-out actions. It is only rendered when `user.profile` is non-null (i.e. onboarding was completed).

### New Section

```
Section heading: "Personal Details"  (same style as "Account Information")
```

Three `InfoRow` entries:

| Icon | Label | Value source |
|---|---|---|
| `Calendar` | Date of Birth | `formatDob(p.dateOfBirth)` |
| `User` | Gender | `p.gender` |
| `MapPin` | Residential Address | `{p.address}, {p.suburb} {p.postcode}` |

### Date Formatting Helper

```typescript
function formatDob(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // e.g. "15 April 1990"
}
```

### InfoRow Component

```typescript
function InfoRow({
  icon: Icon,
  label,
  value,
  sub?,
  last?,
}: { ... })
```

Layout: `flex items-start gap-4 pb-4` + conditional `border-b border-border` (omitted when `last={true}`).

- Icon container: `w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center`
- Label: `text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1`
- Value: `text-sm font-semibold text-foreground`
- Sub (optional): `text-xs text-muted-foreground mt-1`

---

## Integration Checklist

When porting this feature to another project:

1. **Design tokens** — Requires the Civic Editorial token set (`SERVICE_REQUEST_FORM_SPEC.md §Design Tokens`): `bg-background`, `bg-card`, `bg-primary`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`, `text-primary-foreground`, `text-accent`.
2. **Typography** — `font-display` (Fraunces), `font-sans` (Plus Jakarta Sans), `font-mono` (DM Mono).
3. **Auth context** — Add `profileComplete: boolean`, `profile: UserProfile | null`, and `completeProfile(profile: UserProfile): void` to your existing auth context. The gate logic in `AppContent` is the only consumer.
4. **Gate placement** — The onboarding check must run after authentication and before any other page branch. If using a router (React Router, Next.js), implement it as a layout-level redirect: redirect to `/onboarding` if `isAuthenticated && !profileComplete`, with `/onboarding` itself being the only unguarded authenticated route.
5. **Icons** — `lucide-react`: `Wrench`, `Calendar`, `MapPin`, `User`, `ChevronRight`, `AlertCircle`, `Shield`, `Mail`, `LogOut`, `ArrowLeft`.
6. **Gender options** — Adjust `GENDER_OPTIONS` to match the organisation's style guide or local requirements. Always include "Prefer not to say."
7. **Postcode validation** — Current regex (`/^\d{4}$/`) targets Australian postcodes. Replace with the appropriate pattern for other locales.
8. **Backend persistence** — `completeProfile()` currently only updates local React state. In production, call your API inside `completeProfile` before (or instead of) the `setUser` update. If the API call fails, surface the error and do not set `profileComplete: true`.
9. **Session persistence** — Current implementation is in-memory only. Wrap `setUser` with `localStorage` or a session cookie if users should not be re-prompted on page refresh.

---

## Future Considerations

| Feature | Notes |
|---|---|
| Edit profile | Allow users to update DOB, gender, and address from the Profile page without going through the onboarding flow again |
| Field pre-population | If the identity provider returns DOB or address claims (e.g. via Google People API), pre-fill those fields |
| Multi-locale address | Current address model (street / suburb / postcode) is AU-centric; replace with a locale-aware address component for international deployments |
| Terms & privacy checkbox | Add an explicit consent checkbox if legal requires users to acknowledge the privacy policy at account creation time |
| Photo upload | Onboarding is a natural place to let users set a profile photo if not using the Google avatar |
| Accessibility audit | Date input (`<input type="date">`) rendering varies across browsers and screen readers; consider a custom date picker with accessible labelling for production |
