# Service Request Form — Complete Design Specification

**Version:** 1.0  
**Last Updated:** May 27, 2026  
**Design System:** Civic Editorial

---

## Overview

A 4-step multi-page service request form for public infrastructure reporting with civic institutional styling. Features gated navigation, image capture, and comprehensive contact/review workflows.

### Key Features
- 4-step wizard: Location → Issue Details → Contact → Review & Submit
- Mobile-first responsive design with desktop optimization
- Image capture with camera/file upload and drag-and-drop
- Gated navigation (required field validation per step)
- Success screen with reference number generation
- Civic/institutional aesthetic with warm editorial tones

---

## Design Tokens

### Color Palette

```css
/* Primary Colors */
--background: #F2F0EB;           /* Warm parchment background */
--foreground: #1A1B1F;           /* Near-black text */
--card: #FFFFFF;                 /* Pure white cards */
--primary: #1E3A5F;              /* Deep navy (government blue) */
--primary-foreground: #FFFFFF;
--accent: #C4770A;               /* Amber/bronze accent */
--accent-foreground: #FFFFFF;

/* Supporting Colors */
--secondary: #EEF3F8;            /* Light blue-grey */
--muted: #E8E5DF;                /* Subtle warm grey */
--muted-foreground: #6B6860;     /* Mid-tone warm grey */
--border: rgba(26, 27, 31, 0.12); /* Subtle dark border */
--destructive: #C0392B;          /* Error red */

/* Semantic Colors for Severity */
Emerald: #10b981 (Low priority)
Amber: #f59e0b (Medium priority)
Red: #ef4444 (High priority)
```

### Typography

```css
/* Font Families */
--font-display: "Fraunces", "Georgia", serif;
--font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
--font-mono: "DM Mono", ui-monospace, monospace;

/* Font Imports */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&display=swap');

/* Usage */
- Headings (h1, h2): font-display (Fraunces) — bold, serif
- Body text, buttons, inputs: font-sans (Plus Jakarta Sans)
- Labels, reference numbers, metadata: font-mono (DM Mono)
```

### Spacing & Layout

```css
--radius: 0.1875rem;  /* ~3px — near-zero border radius for institutional feel */

/* Standard spacing scale (Tailwind default) */
- Gap between form fields: 1.5rem (24px) — space-y-6
- Section padding: 2rem horizontal, 1.5rem vertical — px-8 py-6
- Card margin: 2rem — gap-8
- Input padding: 0.875rem 0.875rem — px-3.5 py-2.5
```

---

## Layout Structure

### Overall Page Layout

```
┌─────────────────────────────────────────────────┐
│ Header (Primary Navy #1E3A5F)                   │
│ - Logo + Title + Date                           │
└─────────────────────────────────────────────────┘
│                                                 │
│ Main Content (max-w-5xl, centered)              │
│   ┌──────────────┬──────────────────────────┐   │
│   │ Sidebar      │ Form Card (White)        │   │
│   │ - Steps      │ - Step Content           │   │
│   │ - Progress   │ - Navigation             │   │
│   │ - Help Info  │                          │   │
│   │ (sticky)     │                          │   │
│   └──────────────┴──────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
│ Footer (Links + Copyright)                      │
└─────────────────────────────────────────────────┘
```

### Grid System

```jsx
// Desktop (lg breakpoint)
<div className="grid grid-cols-1 lg:grid-cols-[272px_1fr] gap-8">
  <aside className="lg:sticky lg:top-8">
    {/* Sidebar */}
  </aside>
  <div className="bg-card border border-border rounded-sm">
    {/* Form */}
  </div>
</div>
```

---

## Components

### Header

**Background:** `bg-primary` (#1E3A5F)  
**Layout:** Flex, space-between, max-w-5xl centered

```
┌─────────────────────────────────────────────┐
│ [Icon] City Council            Online Svcs  │
│        Public Works...         27 May 2026  │
└─────────────────────────────────────────────┘
```

**Left Section:**
- Accent square icon (9×9, bg-accent, Wrench icon)
- Label: "CITY COUNCIL" (xs, uppercase, mono, tracking-widest, 50% opacity)
- Title: "Public Works & Infrastructure" (lg, display font, semibold)

**Right Section (hidden on mobile):**
- Label: "Online Services" (xs, uppercase, mono)
- Date: Dynamic, formatted as "27 May 2026"

### Sidebar Navigation

**Step Item Structure:**

```
[✓/Icon] Step 1
         Location
```

States:
- **Active:** bg-primary/8, icon in primary filled square
- **Completed:** Check icon, primary/10 background, clickable
- **Idle:** Grey, disabled

**Visual Connector:** 1px vertical line between steps (left-aligned to icon center)

**Help Card Below:**
- Border, rounded, bg-card
- "Need Assistance?" (mono, uppercase)
- "For urgent safety hazards, contact us directly:"
- Phone: 1300 000 000 (semibold)
- "Available 24 hours, 7 days" (xs, muted)

### Form Cards

**Structure:**
```
┌─────────────────────────────────┐
│ StepHeader                      │
│ - Title (xl, display, bold)     │
│ - Description (sm, muted)       │
├─────────────────────────────────┤
│ Content Area (px-8 py-6)        │
│ - Form fields                   │
│ - space-y-6 between groups      │
├─────────────────────────────────┤
│ Navigation Footer               │
│ [← Back]  1 of 4  [Continue →] │
└─────────────────────────────────┘
```

### Input Components

#### TextInput
```jsx
className="w-full px-3.5 py-2.5 border border-border bg-white rounded-sm 
  text-sm text-foreground placeholder:text-muted-foreground/60 
  focus:outline-none focus:ring-2 focus:ring-primary/20 
  focus:border-primary/50 transition-colors"
```

#### TextArea
Same styling as TextInput, add `resize-none`

#### FieldLabel
```jsx
<label className="block text-sm font-semibold text-foreground">
  {children}
  {required && <span className="text-red-500 ml-1">*</span>}
</label>
{hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
```

#### Button Chips (Site Type Selection)
```jsx
// Selected state
className="border-primary bg-primary text-primary-foreground"

// Idle state
className="border-border bg-white text-muted-foreground 
  hover:border-primary/40 hover:text-foreground"
```

---

## Step-by-Step Content

### Step 1: Location Details

**Fields:**

1. **Street Address** (required, 2/3 width)
   - Placeholder: "e.g. 42 Harbour Road"
   - autoComplete: "street-address"

2. **Postcode** (optional, 1/3 width)
   - Placeholder: "e.g. 6003"
   - autoComplete: "postal-code"

3. **Suburb / Area** (required, full width)
   - Placeholder: "e.g. Northbridge"
   - autoComplete: "address-level2"

4. **Additional Location Notes** (optional, textarea)
   - Hint: "Describe nearby landmarks or access points to help us find the exact spot."
   - Placeholder: "e.g. Adjacent to the bus shelter, opposite the car park entrance on the eastern footpath…"
   - rows: 3

5. **Site Type** (required, button grid)
   - Grid: 2 columns mobile, 4 columns desktop
   - Options:
     - Road / Street
     - Footpath / Pathway
     - Park / Reserve
     - Public Building
     - Stormwater / Drain
     - Street Lighting
     - Public Toilet
     - Other

**Validation:** Address, Suburb, and Site Type required to proceed

---

### Step 2: Issue Details

**Priority Order:** Image → Description → Category/Severity

#### Image Capture Zone

**Empty State (Large Hero):**
```
┌─────────────────────────────────────┐
│                                     │
│       [Camera Icon — 72px]          │
│                                     │
│   Capture or attach a photo         │
│   Show the exact location...        │
│                                     │
│   [Take Photo] [Upload File]       │
│                                     │
│   or drag and drop · JPG, PNG...   │
│                                     │
└─────────────────────────────────────┘
```

- Border: 2px dashed, border-border
- Background: muted/20
- Camera icon: 4.5rem circle, bg-primary/10, icon primary/60
- Two buttons: Primary CTA (Take Photo) + Secondary (Upload File)
- Drag-over state: border-primary, bg-primary/5

**Filled State:**
```
┌─────────────────────────────────────┐
│  [Photo preview — h-72, cover]      │
│                                     │
│  [gradient overlay bottom]          │
│  [Camera icon] filename.jpg         │
│                          [Retake]   │
└─────────────────────────────────────┘
```

- Image: object-cover, h-72 (288px)
- Gradient overlay: bg-gradient-to-t from-black/60
- Bottom bar: filename (truncated) + Retake button
- Remove button in top-right corner above image

**Inputs:**
- Camera input: `<input type="file" accept="image/*" capture="environment" />`
- File input: `<input type="file" accept="image/*" />`
- Both hidden, triggered by buttons

#### Description Field

- **Label:** "Description" (required)
- **Hint:** "Minimum 10 characters. Include when the issue began and any immediate risks."
- **Placeholder:** "Describe the issue in detail — what you observed, when it was first noticed, and any safety concerns…"
- **Rows:** 5
- **Character counter:** Bottom-right, shows green when ≥10 chars
- **Helper text:** "Be as specific as possible." (bottom-left)

#### Category & Severity (Compact Row)

**Layout:** 2-column grid (sm:grid-cols-2)

**Category Dropdown:**
- Options:
  - Pothole / Road Damage
  - Graffiti / Vandalism
  - Broken Equipment
  - Flooding / Water Damage
  - Street Light Outage
  - Fallen Tree / Branch
  - Illegal Dumping / Litter
  - Other Infrastructure

**Severity Buttons (3-column grid):**
- Low Priority (green dot)
- Medium Priority (amber dot)
- High Priority (red dot)

Selected state applies color-coded background + border:
- Low: border-emerald-400 bg-emerald-50
- Medium: border-amber-400 bg-amber-50
- High: border-red-400 bg-red-50

**Validation:** Category, Severity, and Description (≥10 chars) required

---

### Step 3: Your Details

**Privacy Notice (top):**
```
┌─────────────────────────────────────┐
│ [Shield]  Your personal details...  │
│           will not be shared...     │
└─────────────────────────────────────┘
```
- Border: border-border, bg-secondary/40
- Shield icon: primary color

**Fields:**

1. **Full Name** (required)
   - Placeholder: "e.g. Sarah Thompson"
   - autoComplete: "name"

2. **Email Address** (required, 1/2 width)
   - Icon: Mail (left-aligned in input)
   - Placeholder: "you@example.com"
   - autoComplete: "email"

3. **Phone Number** (optional, 1/2 width)
   - Label suffix: "(optional)" in muted/xs
   - Icon: Phone (left-aligned)
   - Placeholder: "e.g. 0412 345 678"
   - autoComplete: "tel"

4. **Checkbox:** "Receive status updates by email"
   - Default: Checked
   - Description: "We will notify you when your request is assessed and resolved."

**Validation:** Name and valid email required (contains @ and .)

---

### Step 4: Review & Submit

**Layout:** 3 Review Sections + Terms Checkbox

#### ReviewSection Component
```
┌─────────────────────────────────────┐
│ LOCATION                     [Edit] │
├─────────────────────────────────────┤
│ Address      42 Harbour Road        │
│ Suburb       Northbridge             │
│ Postcode     6003                    │
│ Site Type    Road / Street           │
│ Notes        Adjacent to...          │
└─────────────────────────────────────┘
```

- Header: mono, uppercase, tracking-widest, bg-muted/30
- Rows: label (left, muted) + value (right, bold)
- Edit button: xs, primary, semibold, underline on hover

**Three Sections:**
1. Location (edits → Step 1)
2. Issue Details (edits → Step 2)
3. Your Details (edits → Step 3)

#### Terms Agreement

Checkbox with inline links:
"I confirm the information provided is accurate and agree to the council's [Terms of Service] and [Privacy Policy]."

**Validation:** Must check terms to submit

---

### Success Screen

**Layout:** Centered, max-w-2xl, px-6 py-16

#### Hero
- Check circle icon: 80px, bg-primary/10
- Title: "Request Submitted" (3xl, display, bold)
- Description: "Your service request has been received and logged in our system."

#### Reference Card
```
┌─────────────────────────────────────┐
│     REFERENCE NUMBER                │
│     SR-2026-12345                   │
│     Save this number...             │
├─────────────────────────────────────┤
│ LOCATION          │  ISSUE          │
│ 42 Harbour Road   │  Pothole...     │
│ Northbridge 6003  │  ● High         │
│ Road / Street     │                 │
└─────────────────────────────────────┘
```

- Reference: 3xl, mono, bold, primary, tracking-wider
- Format: SR-{YEAR}-{5-digit random}
- Two-column summary grid

#### Timeline (What happens next?)

3 numbered steps:
1. **Assessment — 1 to 3 business days**
   - "Our team will review your report and categorise the work required."

2. **Scheduling & Planning**
   - "A work order is assigned to the relevant team and scheduled appropriately."

3. **Resolution & Notification**
   - If updates enabled: "We will email {email} when the issue has been resolved."
   - If not: "The issue will be resolved and the site restored to safe condition."

**Icons:** Numbered circles (1, 2, 3) with bg-primary/10

#### Action Buttons
- Primary: "Submit Another Request" (resets form)
- Secondary: "Return to Council Website"

---

## Form State & Validation

### Form Data Structure

```typescript
interface FormData {
  // Step 1
  address: string;
  suburb: string;
  postcode: string;          // optional
  locationNote: string;       // optional
  siteType: string;

  // Step 2
  category: string;
  severity: string;
  description: string;
  photoName: string;          // optional

  // Step 3
  name: string;
  email: string;
  phone: string;              // optional
  receiveUpdates: boolean;    // default: true

  // Step 4
  agreeTerms: boolean;        // default: false
}
```

### Validation Rules

```typescript
const canProceed = () => {
  if (step === 1) 
    return !!(form.address.trim() && form.suburb.trim() && form.siteType);
  
  if (step === 2)
    return !!(form.category && form.severity && form.description.trim().length >= 10);
  
  if (step === 3)
    return !!(form.name.trim() && form.email.includes("@") && form.email.includes("."));
  
  if (step === 4) 
    return form.agreeTerms;
  
  return true;
};
```

### Navigation Logic

- **Back Button:** Enabled when step > 1, decrements step
- **Continue Button:** Enabled when `canProceed()` is true, increments step
- **Submit Button:** Only shown on step 4, enabled when terms agreed
- **Edit Links in Review:** Jump directly to earlier step (allow backward navigation from review)

---

## Icons (lucide-react)

All icons from `lucide-react`:

```jsx
import {
  MapPin,          // Step 1 icon
  AlertTriangle,   // Step 2 icon
  User,            // Step 3 icon
  FileText,        // Step 4 icon
  Check,           // Checkmarks
  ArrowLeft,       // Back button
  ArrowRight,      // Continue button
  ChevronRight,    // Submit button
  Upload,          // Upload file
  X,               // Remove photo
  Wrench,          // Header icon, category
  Camera,          // Photo capture
  RefreshCw,       // Retake photo
  CheckCircle2,    // Success icon
  Shield,          // Privacy notice
  Phone,           // Phone input
  Mail,            // Email input
  Building2,       // Category icons...
  Zap,
  Droplets,
  Leaf,
  Trash2,
  Paintbrush,
  HardHat,
} from "lucide-react";
```

Standard icon size: `w-4 h-4` or `w-5 h-5`

---

## Responsive Breakpoints

```css
/* Mobile-first design */
sm: 640px   /* 2-col → 3-col grids, show date */
lg: 1024px  /* Enable sidebar layout */

/* Key responsive patterns */
- Sidebar: Stacked mobile, sticky sidebar desktop (lg:sticky lg:top-8)
- Input grids: 1-col mobile, 2-col+ desktop
- Site type buttons: 2-col mobile, 4-col desktop
- Footer links: Stacked mobile, row desktop
```

---

## Micro-Interactions & Transitions

```css
/* All interactive elements */
transition-colors    /* Buttons, inputs, borders */
transition-all       /* Complex state changes */

/* Focus states */
focus:outline-none 
focus:ring-2 
focus:ring-primary/20 
focus:border-primary/50

/* Hover states */
hover:bg-primary/90         /* Primary buttons */
hover:border-primary/40     /* Chips, selections */
hover:text-foreground       /* Links, muted text */
```

---

## Constants & Data

### Site Types
```javascript
const SITE_TYPES = [
  "Road / Street",
  "Footpath / Pathway",
  "Park / Reserve",
  "Public Building",
  "Stormwater / Drain",
  "Street Lighting",
  "Public Toilet",
  "Other",
];
```

### Categories (with icons)
```javascript
const CATEGORIES = [
  { value: "pothole", label: "Pothole / Road Damage", icon: HardHat },
  { value: "graffiti", label: "Graffiti / Vandalism", icon: Paintbrush },
  { value: "broken", label: "Broken Equipment", icon: Wrench },
  { value: "flooding", label: "Flooding / Water Damage", icon: Droplets },
  { value: "lighting", label: "Street Light Outage", icon: Zap },
  { value: "trees", label: "Fallen Tree / Branch", icon: Leaf },
  { value: "dumping", label: "Illegal Dumping / Litter", icon: Trash2 },
  { value: "other", label: "Other Infrastructure", icon: Building2 },
];
```

### Severity Levels
```javascript
const SEVERITY = [
  {
    value: "low",
    label: "Low Priority",
    desc: "Minor inconvenience, no immediate safety risk",
    selectedClass: "border-emerald-400 bg-emerald-50",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-800",
    idleClass: "border-border bg-white hover:border-emerald-300 hover:bg-emerald-50/50",
  },
  {
    value: "medium",
    label: "Medium Priority",
    desc: "Affects public use or presents a moderate hazard",
    selectedClass: "border-amber-400 bg-amber-50",
    dotClass: "bg-amber-500",
    textClass: "text-amber-800",
    idleClass: "border-border bg-white hover:border-amber-300 hover:bg-amber-50/50",
  },
  {
    value: "high",
    label: "High Priority",
    desc: "Urgent safety hazard requiring prompt council action",
    selectedClass: "border-red-400 bg-red-50",
    dotClass: "bg-red-500",
    textClass: "text-red-800",
    idleClass: "border-border bg-white hover:border-red-300 hover:bg-red-50/50",
  },
];
```

---

## Implementation Notes

### Tech Stack
- **React** (functional components, hooks)
- **TypeScript** for type safety
- **Tailwind CSS** v4 for styling
- **lucide-react** for icons

### Key Hooks Used
```jsx
const [step, setStep] = useState<Step>(1);
const [submitted, setSubmitted] = useState(false);
const [form, setForm] = useState<FormData>({ /* initial state */ });
const [photoUrl, setPhotoUrl] = useState<string>("");
const [dragOver, setDragOver] = useState(false);

const fileRef = useRef<HTMLInputElement>(null);
const cameraRef = useRef<HTMLInputElement>(null);
const refNum = useRef(`SR-${year}-${randomDigits}`);
```

### File Structure Recommendation
```
src/
├── App.tsx                    # Main component
├── components/
│   ├── FormFields.tsx         # FieldLabel, TextInput, TextArea
│   ├── StepLocation.tsx       # Step 1
│   ├── StepIssue.tsx          # Step 2 (with image upload)
│   ├── StepContact.tsx        # Step 3
│   ├── StepReview.tsx         # Step 4
│   ├── SuccessScreen.tsx      # Post-submission
│   └── Sidebar.tsx            # Navigation sidebar
├── styles/
│   ├── theme.css              # Design tokens
│   └── fonts.css              # Font imports
└── types/
    └── form.ts                # FormData interface
```

### Accessibility Considerations
- All inputs have labels
- Required fields marked with asterisk + aria-required
- Focus states clearly visible
- Color not sole indicator (severity uses dots + text)
- Keyboard navigation supported
- Semantic HTML (header, main, footer, nav, aside)

---

## Quick Start Checklist

To recreate this form in a new React app:

1. ✅ Install dependencies:
   ```bash
   npm install lucide-react
   ```

2. ✅ Set up Tailwind CSS v4 with custom theme

3. ✅ Import fonts (Google Fonts):
   - Fraunces (display)
   - Plus Jakarta Sans (body)
   - DM Mono (monospace)

4. ✅ Copy design tokens to theme.css

5. ✅ Implement FormData interface and validation logic

6. ✅ Build step components:
   - StepLocation
   - StepIssue (with image upload)
   - StepContact
   - StepReview

7. ✅ Add header, sidebar, and success screen

8. ✅ Wire up navigation and state management

9. ✅ Test responsive behavior (mobile → desktop)

10. ✅ Test all validation rules and edge cases

---

## Additional Resources

### Date Formatting
```javascript
new Date().toLocaleDateString("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
})
// Output: "27 May 2026"
```

### Reference Number Generation
```javascript
const refNum = `SR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
// Output: "SR-2026-12345"
```

### Image Preview
```javascript
const handleFile = (file: File) => {
  setVal("photoName", file.name);
  setPhotoUrl(URL.createObjectURL(file));
};
```

---

## Design Philosophy

This form embodies a **civic institutional aesthetic** with:

- **Authority:** Deep navy primary, minimal borders, structured layout
- **Warmth:** Parchment background, editorial serif (Fraunces), amber accents
- **Clarity:** High contrast, generous whitespace, clear hierarchy
- **Trust:** Privacy notices, reference numbers, transparent timeline
- **Accessibility:** Mono labels, color + text severity, clear focus states

The design prioritizes **user confidence** through institutional design patterns while maintaining **approachability** through warm tones and friendly copy.

---

**End of Specification**

Use this document as a complete reference to rebuild the Service Request form in any React environment. All design tokens, layouts, copy, and validation logic are included above.
