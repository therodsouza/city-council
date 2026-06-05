# Authentication System Specification — Service Request Form

**Version:** 1.0  
**Last Updated:** June 1, 2026  
**Type:** Mock Google OAuth (upgradeable to real OAuth)

---

## Overview

Authentication system for the Service Request form that requires users to sign in with Google before accessing the form. Features mock Google OAuth for prototyping, profile management, and auto-filled user details.

### Key Features
- **Login required** — Users must authenticate before accessing the form
- **Mock Google OAuth** — Simulates Google sign-in flow for development
- **Profile page** — View account information and sign out
- **Profile button** — Header avatar/name button for quick profile access
- **Auto-fill** — User's name and email pre-populate in form Step 3
- **Responsive** — Mobile and desktop optimized
- **Civic aesthetic** — Matches institutional design system

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── App.tsx                      # Main router (login gate)
│   ├── ServiceRequestForm.tsx       # Original form (now receives user prop)
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth state management
│   └── components/
│       ├── Login.tsx                # Login page with Google button
│       └── Profile.tsx              # User profile page
```

### Component Hierarchy

```
App (AuthProvider wrapper)
├── AuthContext
│   ├── Login (if !isAuthenticated)
│   ├── Profile (if currentPage === "profile")
│   └── ServiceRequestForm (if isAuthenticated && currentPage === "form")
│       └── Header with Profile Button
```

---

## 1. AuthContext — State Management

**File:** `src/app/contexts/AuthContext.tsx`

### Purpose
Manages authentication state globally using React Context. Provides login/logout functions and user data to all components.

### Interface Definitions

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  photo: string;  // Avatar URL
}

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}
```

### Implementation

```typescript
import { createContext, useContext, useState, ReactNode } from "react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = () => {
    // Mock Google OAuth - replace with real OAuth later
    const mockUser: User = {
      id: "mock-user-123",
      name: "Sarah Thompson",
      email: "sarah.thompson@example.com",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### Mock User Data

The mock login creates a user with:
- **ID:** `"mock-user-123"`
- **Name:** `"Sarah Thompson"` (customizable)
- **Email:** `"sarah.thompson@example.com"`
- **Photo:** Generated avatar from DiceBear API (free avatar service)

### Usage in Components

```typescript
import { useAuth } from "../contexts/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }
  
  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

---

## 2. Login Page

**File:** `src/app/components/Login.tsx`

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Header (Primary Navy)                   │
│ - Logo + City Council Title             │
├─────────────────────────────────────────┤
│                                         │
│         Welcome (centered)              │
│         Sign in to submit...            │
│                                         │
│   ┌───────────────────────────────┐     │
│   │ [Google Icon] Sign in with... │     │
│   │                               │     │
│   │ By signing in, you agree...   │     │
│   └───────────────────────────────┘     │
│                                         │
│   ✓ Track Your Requests                │
│   ✓ Faster Submissions                 │
│   ✓ Secure & Private                   │
│                                         │
├─────────────────────────────────────────┤
│ Footer (Copyright + Links)              │
└─────────────────────────────────────────┘
```

### Design Specifications

#### Page Layout
- **Container:** `max-w-md` centered
- **Background:** `bg-background` (#F2F0EB parchment)
- **Vertical:** Flex column with centered content
- **Padding:** `px-6 py-12` for main content

#### Header Section
Same header as main form:
- Background: `bg-primary` (#1E3A5F)
- Logo: Accent square (9×9) with Wrench icon
- Title: "City Council" (mono, uppercase) + "Public Works & Infrastructure" (display font)

#### Welcome Section
```jsx
<h1 className="font-display text-4xl font-bold text-foreground mb-3">
  Welcome
</h1>
<p className="text-muted-foreground">
  Sign in to submit service requests and track your reports
</p>
```

#### Google Sign-In Button

**Button Styling:**
```jsx
className="w-full flex items-center justify-center gap-3 px-6 py-3.5 
  bg-white border-2 border-border rounded-sm text-foreground font-semibold 
  hover:bg-muted/30 transition-colors"
```

**Google Logo SVG:**
```jsx
<svg className="w-5 h-5" viewBox="0 0 24 24">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
```

**Text:** "Sign in with Google" (semibold)

**onClick Handler:** `onClick={login}` (calls AuthContext login function)

#### Terms Notice
```jsx
<p className="text-xs text-muted-foreground text-center">
  By signing in, you agree to our{" "}
  <span className="text-primary underline cursor-pointer">Terms of Service</span>{" "}
  and{" "}
  <span className="text-primary underline cursor-pointer">Privacy Policy</span>
</p>
```

#### Benefits List

Three benefit items with icons:

**Structure:**
```jsx
<div className="flex items-start gap-3">
  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
    <Icon className="w-3 h-3 text-primary" />
  </div>
  <div>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
</div>
```

**Benefits:**
1. **Track Your Requests** (CheckCircle2 icon)
   - "View status updates and history of all your service requests"

2. **Faster Submissions** (Clock icon)
   - "Your details are saved for quicker future requests"

3. **Secure & Private** (Shield icon)
   - "Your information is encrypted and never shared with third parties"

#### Footer
Same footer as main form with copyright and links

### Icons Required
```typescript
import { Wrench, CheckCircle2, Shield, Clock } from "lucide-react";
```

---

## 3. Profile Page

**File:** `src/app/components/Profile.tsx`

### Props Interface
```typescript
interface ProfileProps {
  onBack: () => void;  // Navigate back to form
}
```

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Header (Primary Navy)                   │
│ Logo + Title      [← Back to Form]      │
├─────────────────────────────────────────┤
│ Your Profile                            │
│ Manage your account...                  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ PROFILE HEADER                      │ │
│ │ [Avatar] Sarah Thompson             │ │
│ │          Council Service Portal...  │ │
│ ├─────────────────────────────────────┤ │
│ │ ACCOUNT INFORMATION                 │ │
│ │                                     │ │
│ │ [👤] FULL NAME                      │ │
│ │      Sarah Thompson                 │ │
│ │                                     │ │
│ │ [✉️] EMAIL ADDRESS                  │ │
│ │      sarah.thompson@example.com     │ │
│ │                                     │ │
│ │ [G] AUTHENTICATION PROVIDER         │ │
│ │     Google Account                  │ │
│ │     Connected via Google OAuth 2.0  │ │
│ ├─────────────────────────────────────┤ │
│ │ [Sign Out] button                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Note: Your contact information will be │
│ automatically pre-filled...             │
├─────────────────────────────────────────┤
│ Footer                                  │
└─────────────────────────────────────────┘
```

### Design Specifications

#### Page Layout
- **Container:** `max-w-3xl` centered
- **Padding:** `px-6 py-10`

#### Header Modifications
- **Back Button:** Top-right corner
  ```jsx
  <button onClick={onBack} className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground">
    <ArrowLeft className="w-4 h-4" />
    <span className="hidden sm:inline">Back to Form</span>
  </button>
  ```

#### Profile Card

**Card Container:**
```jsx
className="bg-card border border-border rounded-sm overflow-hidden"
```

**Profile Header Section:**
```jsx
<div className="px-8 py-6 border-b border-border bg-muted/20">
  <div className="flex items-center gap-4">
    {/* Avatar */}
    <div className="w-20 h-20 rounded-sm overflow-hidden bg-muted flex-shrink-0 border-2 border-border">
      <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
    </div>
    
    {/* User Info */}
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">{user.name}</h2>
      <p className="text-sm text-muted-foreground mt-1">Council Service Portal User</p>
    </div>
  </div>
</div>
```

**Account Information Section:**

Section header:
```jsx
<h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-4">
  Account Information
</h3>
```

**Info Row Pattern:**
```jsx
<div className="flex items-start gap-4 pb-4 border-b border-border">
  {/* Icon */}
  <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
    <Icon className="w-5 h-5 text-primary" />
  </div>
  
  {/* Content */}
  <div className="flex-1">
    <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">
      {label}
    </p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
  </div>
</div>
```

**Three Info Rows:**

1. **Full Name**
   - Icon: `User` (lucide-react)
   - Label: "FULL NAME"
   - Value: `{user.name}`

2. **Email Address**
   - Icon: `Mail` (lucide-react)
   - Label: "EMAIL ADDRESS"
   - Value: `{user.email}`

3. **Authentication Provider**
   - Icon: Google logo SVG (same as login page)
   - Label: "AUTHENTICATION PROVIDER"
   - Value: "Google Account"
   - Subtitle: "Connected via Google OAuth 2.0"

**Actions Section:**
```jsx
<div className="px-8 py-6 border-t border-border bg-muted/10">
  <button
    type="button"
    onClick={logout}
    className="flex items-center gap-2 px-5 py-2.5 border border-destructive bg-white text-destructive text-sm font-semibold rounded-sm hover:bg-destructive hover:text-white transition-colors"
  >
    <LogOut className="w-4 h-4" />
    Sign Out
  </button>
</div>
```

#### Info Notice

Below the card:
```jsx
<div className="mt-6 p-4 border border-border rounded-sm bg-secondary/40">
  <p className="text-sm text-muted-foreground">
    <strong className="text-foreground">Note:</strong> Your contact information will be
    automatically pre-filled when submitting service requests. You can update your details
    through your Google Account settings.
  </p>
</div>
```

### Icons Required
```typescript
import { Wrench, Mail, LogOut, ArrowLeft, User } from "lucide-react";
```

---

## 4. App Router — Main Integration

**File:** `src/app/App.tsx`

### Purpose
Main entry point that wraps everything in AuthProvider and routes between Login, Form, and Profile pages.

### Implementation

```typescript
import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Login } from "./components/Login";
import { Profile } from "./components/Profile";
import { ServiceRequestForm } from "./ServiceRequestForm";

type Page = "form" | "profile";

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("form");

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show profile page
  if (currentPage === "profile") {
    return <Profile onBack={() => setCurrentPage("form")} />;
  }

  // Show form with profile button
  return (
    <ServiceRequestForm
      user={user}
      onProfileClick={() => setCurrentPage("profile")}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### Routing Logic

1. **Not Authenticated** → Show `<Login />`
2. **Authenticated + currentPage = "form"** → Show `<ServiceRequestForm />`
3. **Authenticated + currentPage = "profile"** → Show `<Profile />`

### State Management
- `currentPage` state controls navigation between form and profile
- `isAuthenticated` from AuthContext controls login gate
- `user` passed as prop to ServiceRequestForm for auto-fill

---

## 5. ServiceRequestForm Modifications

**File:** `src/app/ServiceRequestForm.tsx`

### Changes Required

#### 1. Add Props Interface

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
}

// Change from:
export default function App() {

// Change to:
export function ServiceRequestForm({ 
  user, 
  onProfileClick 
}: { 
  user: User | null; 
  onProfileClick: () => void 
}) {
```

#### 2. Pre-fill User Data in Form State

```typescript
const [form, setForm] = useState<FormData>({
  address: "",
  suburb: "",
  postcode: "",
  locationNote: "",
  siteType: "",
  category: "",
  severity: "",
  description: "",
  photoName: "",
  name: user?.name || "",           // ← Auto-fill from user
  email: user?.email || "",         // ← Auto-fill from user
  phone: "",
  receiveUpdates: true,
  agreeTerms: false,
});
```

#### 3. Add Profile Button to Header

Replace the header's right section:

```typescript
// OLD:
<div className="hidden sm:block text-right">
  <p className="text-xs text-primary-foreground/50 uppercase tracking-widest font-mono mb-0.5">
    Online Services
  </p>
  <p className="text-sm text-primary-foreground/70">
    {new Date().toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}
  </p>
</div>

// NEW:
<div className="flex items-center gap-4">
  <div className="hidden sm:block text-right">
    <p className="text-xs text-primary-foreground/50 uppercase tracking-widest font-mono mb-0.5">
      Online Services
    </p>
    <p className="text-sm text-primary-foreground/70">
      {new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    </p>
  </div>
  {user && (
    <button
      type="button"
      onClick={onProfileClick}
      className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20"
      title="View Profile"
    >
      <img
        src={user.photo}
        alt={user.name}
        className="w-7 h-7 rounded-sm border border-primary-foreground/30"
      />
      <span className="hidden md:block text-sm text-primary-foreground font-medium">
        {user.name.split(" ")[0]}
      </span>
    </button>
  )}
</div>
```

**Profile Button Styling:**
- Avatar: 7×7 (28px), rounded-sm, with border
- Background: `bg-primary-foreground/10` (semi-transparent white)
- Hover: `hover:bg-primary-foreground/20`
- Name: Hidden on mobile (`hidden md:block`), shows first name only
- Border: Subtle outline for definition

#### 4. Fix Icon Import Conflict

```typescript
// Change import to avoid conflict with User interface
import {
  User as UserIcon,  // ← Rename icon import
  // ... other icons
} from "lucide-react";

// Then in STEPS constant:
const STEPS = [
  { id: 1, label: "Location", sub: "Where is the issue?", icon: MapPin },
  { id: 2, label: "Issue Details", sub: "Describe the problem", icon: AlertTriangle },
  { id: 3, label: "Your Details", sub: "Contact information", icon: UserIcon }, // ← Use renamed icon
  { id: 4, label: "Review & Submit", sub: "Confirm your request", icon: FileText },
];
```

---

## 6. User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  START: User opens app                                      │
│                                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ isAuthenticated?   │
            └────────┬───────────┘
                     │
         ┌───────────┴──────────┐
         │ NO                   │ YES
         ▼                      ▼
┌─────────────────┐    ┌─────────────────────┐
│  LOGIN PAGE     │    │ SERVICE REQUEST     │
│                 │    │ FORM                │
│ - Welcome       │    │                     │
│ - Google Button │    │ Header shows:       │
│ - Benefits      │    │ [Avatar] FirstName  │
│                 │    │                     │
│ [Click Sign In] │    │ Step 3 pre-filled:  │
│        │        │    │ - Name from Google  │
│        ▼        │    │ - Email from Google │
│   login()       │    │                     │
│        │        │    │ [Click Avatar]      │
│        │        │    │        │            │
│        └────────┼────┘        ▼            │
│                 │    ┌────────────────┐    │
│                 │    │ PROFILE PAGE   │    │
│                 │    │                │    │
│                 │    │ - User Info    │    │
│                 │    │ - Avatar       │    │
│                 │    │ - Email        │    │
│                 │    │ - Provider     │    │
│                 │    │                │    │
│                 │    │ [Sign Out]     │    │
│                 │    │     │          │    │
│                 │    │     ▼          │    │
│                 │    │  logout()      │    │
│                 │    │     │          │    │
│                 └────┼─────┘          │    │
│                      │                │    │
│                      ▼                │    │
│              Back to LOGIN PAGE       │    │
│                                       │    │
│              [Back to Form]───────────┘    │
│                      │                     │
│                      ▼                     │
│              SERVICE REQUEST FORM          │
│                                            │
└────────────────────────────────────────────┘
```

---

## 7. Integration Checklist

To add authentication to an existing Service Request form:

### Step 1: Install Dependencies
No additional dependencies required (uses existing React and lucide-react).

### Step 2: Create Auth Files

1. ✅ Create `src/app/contexts/AuthContext.tsx`
2. ✅ Create `src/app/components/Login.tsx`
3. ✅ Create `src/app/components/Profile.tsx`

### Step 3: Modify Existing Files

1. ✅ **Rename** `App.tsx` → `ServiceRequestForm.tsx`
2. ✅ **Create new** `App.tsx` with router logic
3. ✅ **Modify** `ServiceRequestForm.tsx`:
   - Add User props interface
   - Add `user` and `onProfileClick` props
   - Pre-fill name/email from user
   - Add profile button to header
   - Rename `User` icon import to `UserIcon`

### Step 4: Test Flow

1. ✅ App loads → Login page appears
2. ✅ Click "Sign in with Google" → Mock user logs in
3. ✅ Form appears with profile button in header
4. ✅ Step 3 shows pre-filled name and email
5. ✅ Click profile button → Profile page appears
6. ✅ Click "Back to Form" → Return to form
7. ✅ Click "Sign Out" → Return to login page

---

## 8. Upgrading to Real Google OAuth

When ready to switch from mock to real Google authentication:

### Prerequisites
1. Google Cloud Console project
2. OAuth 2.0 Client ID
3. Authorized redirect URIs configured

### Changes Required in AuthContext.tsx

```typescript
// Replace mock login with real OAuth
const login = () => {
  // Redirect to Google OAuth
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20email%20profile`;
};

// Add OAuth callback handler
useEffect(() => {
  // Parse OAuth callback
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  
  if (code) {
    // Exchange code for tokens
    exchangeCodeForTokens(code).then((user) => {
      setUser(user);
    });
  }
}, []);
```

### Environment Variables
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_REDIRECT_URI=http://localhost:5173/callback
```

### Backend Required
Real OAuth requires a backend to:
- Exchange authorization code for tokens
- Validate ID tokens
- Manage refresh tokens
- Store user sessions

---

## 9. Design Tokens Reference

All components use the existing civic design system:

### Colors
```css
--background: #F2F0EB        /* Parchment */
--primary: #1E3A5F           /* Navy */
--accent: #C4770A            /* Amber */
--border: rgba(26,27,31,0.12)
--destructive: #C0392B       /* Red for sign out */
```

### Typography
```css
--font-display: "Fraunces"      /* Headings */
--font-sans: "Plus Jakarta Sans" /* Body */
--font-mono: "DM Mono"          /* Labels */
```

### Spacing
- Card padding: `px-8 py-6`
- Page margins: `max-w-3xl mx-auto`
- Gap between elements: `gap-4` or `space-y-6`

### Border Radius
- Cards: `rounded-sm` (~3px, institutional)
- Buttons: `rounded-sm`
- Avatars: `rounded-sm` (square with slight rounding)

---

## 10. Responsive Behavior

### Login Page
- **Mobile:** Full-width card, stacked benefits
- **Desktop:** Centered max-w-md container

### Profile Page
- **Mobile:** Full-width card, "Back to Form" shows arrow only
- **Desktop:** max-w-3xl container, "Back to Form" shows text

### Profile Button in Header
- **Mobile:** Avatar only (7×7)
- **Tablet:** Avatar + first name
- **Desktop:** Avatar + full first name

### Breakpoints
```css
sm: 640px   /* Show date in header, benefit layout changes */
md: 768px   /* Show name in profile button */
lg: 1024px  /* N/A for auth components */
```

---

## 11. Accessibility Considerations

### ARIA Labels
```jsx
<button title="View Profile" aria-label="View your profile">
  <img alt={user.name} />
</button>
```

### Keyboard Navigation
- All buttons are keyboard accessible
- Tab order follows visual hierarchy
- Focus states visible with ring

### Screen Readers
- Avatar images have descriptive alt text
- Buttons have clear labels
- Form fields maintain existing accessibility

### Color Contrast
- All text meets WCAG AA standards
- Focus rings clearly visible
- Button states have sufficient contrast

---

## 12. Testing Scenarios

### Mock Authentication Testing

**Test 1: Initial Load**
- ✅ App loads
- ✅ Login page appears
- ✅ Google button is visible
- ✅ No console errors

**Test 2: Login Flow**
- ✅ Click "Sign in with Google"
- ✅ Mock user is created
- ✅ Form appears
- ✅ Profile button visible in header

**Test 3: Auto-fill Behavior**
- ✅ Navigate to Step 3
- ✅ Name field shows "Sarah Thompson"
- ✅ Email field shows "sarah.thompson@example.com"
- ✅ Phone field is empty (as expected)

**Test 4: Profile Navigation**
- ✅ Click profile button
- ✅ Profile page appears
- ✅ User info is correct
- ✅ Avatar displays
- ✅ Back button works

**Test 5: Logout Flow**
- ✅ Click "Sign Out" on profile page
- ✅ User is logged out
- ✅ Redirected to login page
- ✅ Cannot access form anymore

**Test 6: Responsive Behavior**
- ✅ Mobile: Avatar only in header
- ✅ Desktop: Avatar + name in header
- ✅ Profile page adapts to screen size

---

## 13. Common Customizations

### Change Mock User Data

In `AuthContext.tsx`:
```typescript
const mockUser: User = {
  id: "custom-id",
  name: "Your Name Here",
  email: "your.email@example.com",
  photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=YourName",
};
```

### Customize Avatar Service

Replace DiceBear with another service:
```typescript
photo: "https://ui-avatars.com/api/?name=Sarah+Thompson&background=1E3A5F&color=fff"
```

### Add More Profile Fields

In Profile.tsx, add another info row:
```jsx
<div className="flex items-start gap-4 pb-4 border-b border-border">
  <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
    <Phone className="w-5 h-5 text-primary" />
  </div>
  <div className="flex-1">
    <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">
      Phone Number
    </p>
    <p className="text-sm font-semibold text-foreground">{user.phone || "Not provided"}</p>
  </div>
</div>
```

### Persist Login State

Use localStorage to persist across page refreshes:
```typescript
// In AuthContext.tsx
useEffect(() => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    setUser(JSON.parse(savedUser));
  }
}, []);

const login = () => {
  const mockUser = { /* ... */ };
  setUser(mockUser);
  localStorage.setItem('user', JSON.stringify(mockUser));
};

const logout = () => {
  setUser(null);
  localStorage.removeItem('user');
};
```

---

## 14. File Size Reference

Approximate line counts:
- **AuthContext.tsx:** ~60 lines
- **Login.tsx:** ~150 lines
- **Profile.tsx:** ~180 lines
- **App.tsx (router):** ~35 lines
- **ServiceRequestForm.tsx modifications:** ~30 lines changed

Total new code: ~425 lines

---

**End of Specification**

Use this document to integrate authentication into the Service Request form. All design tokens, layouts, logic, and integration steps are included above.
