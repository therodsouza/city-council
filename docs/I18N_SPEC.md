# i18n Spec — React SPA with i18next

This spec describes the internationalization approach used in this project and can be adopted verbatim in any React + Vite SPA that needs multi-language support.

---

## Overview

All user-facing strings are extracted from component files into per-locale JSON files. At runtime, `i18next` resolves the active language, looks up each key, and substitutes dynamic values via interpolation. Switching languages triggers a React re-render without a page reload, and the chosen language persists to `localStorage` so the preference survives refreshes.

---

## Stack

| Package | Role |
|---|---|
| `i18next` | Core i18n engine — key lookup, interpolation, fallback |
| `react-i18next` | React bindings — `useTranslation` hook, re-render on language change |
| `i18next-browser-languagedetector` | Detects browser language on first visit; reads/writes `localStorage` on subsequent visits |

---

## File Structure

```
src/
└── i18n/
    ├── index.ts          # Library init — imported once in main.tsx
    └── locales/
        ├── en.json       # English strings (baseline)
        └── pt-BR.json    # Brazilian Portuguese strings
```

Translation files are bundled into the main JS chunk at build time. There is no lazy loading — the app is small enough that a single bundle is appropriate. If the locale catalogue grows significantly, switch to `i18next-http-backend` and serve locale files from the CDN separately.

---

## Initialisation

`src/i18n/index.ts` bootstraps i18next once. It is imported as a side effect in `src/main.tsx` before the React tree mounts, so translations are ready synchronously on first render.

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'pt-BR': { translation: ptBR },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },   // React escapes output; double-escaping not needed
    detection: {
      order: ['localStorage', 'navigator'],  // localStorage wins on return visits
      caches: ['localStorage'],
    },
  });
```

```ts
// src/main.tsx
import './i18n';   // must precede App import
import App from './App.tsx';
```

---

## Translation Files

Each locale file is a flat-ish JSON object. Keys are grouped by screen or component to make the file scannable and to avoid collisions.

```
{
  "common":       { ... }   // shared across screens (back, continue, step counter)
  "brand":        { ... }   // name, academy, course title, phone
  "auth":         { ... }   // login / signup screen
  "wizard":       { ... }   // step titles, sublabels, blurbs
  "step1":        { ... }   // personal details fields + validation errors
  "step2":        { ... }   // document upload cards
  "step3":        { ... }   // course info + payment summary
  "step4":        { ... }   // terms text + checkbox labels + signature field
  "confirmation": { ... }   // success screen
}
```

The English file is the source of truth. Every key in `en.json` must have a corresponding key in every other locale file. Missing keys fall back to English via `fallbackLng`.

### Dynamic values

Use `{{variable}}` placeholders for runtime substitution:

```json
"step_of": "Step {{step}} of 4",
"badge_protocol": "Protocol {{protocol}}"
```

```tsx
t('common.step_of', { step: 2 })        // → "Step 2 of 4"
t('confirmation.badge_protocol', { protocol: data.protocol })
```

---

## Usage in Components

Add `useTranslation` at the top of any component that renders text. Call `t('key')` in place of every string literal.

```tsx
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('wizard.steps.1.title')}</h1>;
}
```

### React Hook Form validation messages

`register()` accepts string messages directly. Pass `t()` calls inline — they are evaluated at render time, so they update when the language changes.

```tsx
const { t } = useTranslation();

register('fullName', { required: t('step1.err_full_name') })
```

For `validate` functions that return a string, thread `t` in as a parameter so the function remains pure:

```ts
validate: (v) => validateCPF(v, t)

function validateCPF(value: string, t: (key: string) => string): true | string {
  if (digits.length !== 11) return t('step1.err_cpf_digits');
  // ...
}
```

### Arrays built at render time

Avoid module-level arrays that contain translated strings — they are frozen at import time and won't update when the language changes. Build them inside the component body where `t` is in scope.

```tsx
// ✗ module level — won't update
const STEPS = [{ label: 'Personal Details' }];

// ✓ inside component — reactive
const { t } = useTranslation();
const steps = [1, 2, 3, 4].map(n => ({ label: t(`wizard.steps.${n}.title`) }));
```

---

## Language Switcher

A fixed toggle button in `App.tsx` switches between locales. `i18n.changeLanguage()` updates `localStorage` and triggers a re-render of all components using `useTranslation`.

```tsx
const { i18n } = useTranslation();
const toggle = () => i18n.changeLanguage(i18n.language === 'en' ? 'pt-BR' : 'en');
```

The button is rendered outside the screen components (at the `App` level) so it is always visible regardless of which screen is active.

---

## Adding a New Locale

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<locale>.json`.
2. Translate all values. Do not change keys.
3. Import the new file in `src/i18n/index.ts` and add it to `resources`.
4. Add the new language code to the switcher in `App.tsx`.

---

## Adding a New String

1. Add the key + English value to `en.json`.
2. Add the same key + translated value to every other locale file.
3. Replace the hardcoded string in the component with `t('the.new.key')`.

Never use `t()` outside a React component or hook. If a translated string is needed in a utility function, pass `t` as a parameter.

---

## Key Naming Conventions

| Pattern | Example |
|---|---|
| `<screen>.<field>` | `step1.full_name` |
| `<screen>.err_<field>` | `step1.err_full_name` |
| `<screen>.<noun>_<attribute>` | `step2.photo_id_title` |
| `common.<shared_action>` | `common.back`, `common.continue` |
| Dynamic values use `{{camelCase}}` | `{{protocol}}`, `{{step}}` |

---

## Caveats

- **No TypeScript key safety** — key strings are unchecked at compile time. A typo returns `undefined` silently and falls back to the key string itself. If the catalogue grows, consider generating types from `en.json` using `i18next-typescript-plugin`.
- **No pluralisation in use** — i18next supports plural forms natively (`_one` / `_other` suffixes), but no plural strings exist in this app yet.
- **Prices are hardcoded per locale** — `step3.tuition_value` etc. are plain strings in each locale file (`"R$ 1,890.00"` in EN, `"R$ 1.890,00"` in PT-BR). If prices become dynamic, replace them with `Intl.NumberFormat` and remove the value keys from the locale files.
