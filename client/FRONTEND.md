# CasaClean Client — Front-End Architecture & Implementation Reference

This document describes everything implemented under the `client/` folder: the marketing site, booking funnel, authentication surfaces, design system, data layer, SEO, internationalization, and API integration. It is scoped exclusively to the front end and written for senior engineers onboarding to or reviewing the codebase.

---

## 1. Product scope

The client is a **production-grade marketing and booking application** for **CasaClean** — a premium turnover-cleaning service for vacation rentals (Airbnb hosts, property managers, short-term rental operators). It is not a minimal landing page; it is a full multi-route SPA with:

- A narrative **home page** composed of eleven independent sections
- **Services**, **about**, **FAQ**, and **careers**
- A **multi-step booking wizard** with live quote calculation and API submission
- **Contact** and **newsletter** lead capture
- **Sign-in / sign-up** auth UI (wired to backend JWT + httpOnly cookies)
- **SEO**, structured data, sitemap, and robots configuration
- **i18n** (English, Georgian, Italian) with locale persistence

The backend lives in `server/`; this client consumes it via a centralized Axios layer and degrades gracefully when endpoints are unavailable (preview/static demos).

---

## 2. Technology stack

| Layer | Choice | Notes |
|--------|--------|--------|
| Runtime | React 19 | JavaScript only — no TypeScript |
| Bundler | Vite 8 | `@` path alias → `src/` |
| Routing | React Router v7 | Declarative route table, lazy pages, layout nesting |
| Styling | Tailwind CSS v4 | Token-driven `@theme` in `styles/globals.css` |
| Animation | Framer Motion 12 | Page transitions, wizard steps, scroll reveals |
| Forms | React Hook Form 7 + Zod 4 | `@hookform/resolvers` for schema validation |
| Server state | TanStack Query 5 | Mutations for booking, contact, auth |
| HTTP | Axios | `withCredentials: true` for cookie-based auth |
| Head / SEO | react-helmet-async | Per-page meta + JSON-LD injection |
| Icons | Lucide React | Tree-shaken via explicit imports |
| Utilities | `clsx` + `tailwind-merge` | `cn()` helper in `lib/cn.js` |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API origin (default: `http://localhost:8000/api/v1`) |
| `VITE_SITE_URL` | Public site origin for canonical URLs and Open Graph |

Defined in `.env.example`; consumed via `import.meta.env`.

---

## 3. Repository layout (`client/src`)

The codebase follows **feature-driven architecture** with **atomic design** for shared UI and strict separation of content, presentation, and logic.

```
client/
├── public/                 # Static assets: favicon, robots.txt, sitemap.xml, icons.svg
├── index.html              # Font preconnect, default title/description, root mount
├── vite.config.js          # React + Tailwind plugins, @ alias, manualChunks
├── eslint.config.js
├── jsconfig.json           # Path mapping for editor tooling
├── package.json
└── src/
    ├── main.jsx            # Entry: globals.css + App
    ├── App.jsx             # Root: AppProviders + global Seo + AppRouter
    ├── app/                # Application shell
    │   ├── providers/      # Provider composition order
    │   ├── layouts/        # MainLayout, EmptyLayout, DashboardLayout (scaffold)
    │   └── router/         # routeConfig.js + routes.jsx + AnimatePresence
    ├── pages/              # Route-level thin orchestrators
    │   └── Home/sections/  # One component per home section
    ├── features/           # Domain modules (api, hooks, validation, components)
    ├── components/
    │   ├── ui/             # Design-system primitives
    │   ├── layout/         # Navbar, Footer, MobileMenu, LanguageSwitcher
    │   ├── sections/       # PageHero, CtaSection
    │   └── shared/         # Reveal, Page, Logo, ErrorBoundary, etc.
    ├── hooks/              # Cross-cutting behavior hooks
    ├── services/api/       # Axios, endpoints, interceptors
    ├── seo/                # Seo, MetaTags, SchemaMarkup, structured-data builders
    ├── animations/         # Motion variants + easing tokens
    ├── i18n/               # Provider, locales, useTranslation
    ├── constants/          # routes, navigation, metadata
    ├── data/               # Local CMS-style content modules
    ├── utils/              # Pure helpers (formatting, SEO, slugs)
    ├── styles/             # globals, typography, utilities, animations
    ├── lib/                # cn()
    └── assets/             # Images (e.g. hero.png)
```

---

## 4. Application bootstrap and provider graph

### Entry (`main.jsx`)

Mounts `App` into `#root` after importing `styles/globals.css` (Tailwind + design tokens + base layers).

### Root (`App.jsx`)

Wraps the tree in `AppProviders`, injects **site-wide** `<Seo>` (default title, path `/`, Organization + WebSite JSON-LD), then renders `AppRouter`.

### Provider stack (`app/providers/AppProviders.jsx`)

Order is intentional — outer layers catch or supply context inner layers depend on:

```
ErrorBoundary
  └── HelmetProvider
        └── BrowserRouter
              └── QueryProvider (TanStack QueryClient)
                    └── I18nProvider
                          └── ThemeProvider
                                └── MotionProvider (Framer MotionConfig)
                                      └── children
```

| Provider | Responsibility |
|----------|----------------|
| `ErrorBoundary` | Class boundary; recoverable fallback + reload |
| `HelmetProvider` | Async-safe `<head>` updates per route |
| `BrowserRouter` | Location, navigation, layout outlets |
| `QueryProvider` | Default query/mutation client for API calls |
| `I18nProvider` | Locale state, `t()`, `setLocale`, `<html lang/dir>` sync |
| `ThemeProvider` | Theme context (extensible; wraps UI tree) |
| `MotionProvider` | `reducedMotion="user"` + default transition easing |

---

## 5. Routing and layouts

### Single source of truth (`constants/routes.js`)

All path strings are defined once as `ROUTES` (including the parameterized helper `serviceDetail(slug)`). Navigation, links, and `routeConfig` import from here — no duplicated path literals.

### Route table (`app/router/routeConfig.js`)

Every page is **`React.lazy` imported** — one async chunk per route. Routes are grouped by layout:

| Group | Layout | Routes |
|-------|--------|--------|
| `MAIN_ROUTES` | `MainLayout` (Navbar + Footer) | `/`, `/services`, `/services/:slug`, `/about`, `/contact`, `/faq`, `/careers`, `/privacy`, `/terms` |
| `FOCUSED_ROUTES` | `EmptyLayout` (minimal header) | `/booking` |
| `BARE_ROUTES` | None (page owns chrome) | `/signin`, `/signup` |
| `FALLBACK_ROUTE` | `MainLayout` | `*` → NotFound |

Adding a marketing page is a **one-line entry** in `MAIN_ROUTES` plus a lazy import — open/closed for extension.

### Route rendering (`app/router/routes.jsx`)

- Single `<Suspense fallback={<PageLoader />}>` around all routes
- `<AnimatePresence mode="wait">` keyed on `location.pathname` for enter/exit page motion
- Nested `<Routes>` inside layout `<Outlet>` shells

### Layouts

**`MainLayout`** — Full marketing chrome: skip-to-content link (`#main-content`), sticky `Navbar`, flex-growing `<main>`, `Footer`. Accessible landmark structure.

**`EmptyLayout`** — Focused flows: sand background, blurred header with `Logo` + support phone link only. Used for booking to reduce distraction.

**`DashboardLayout`** — Scaffold for future authenticated host dashboard (header + “Host dashboard” label). Not yet wired in `routeConfig`; ready for post-MVP routes.

---

## 6. Pages and marketing surfaces

Pages are **thin orchestrators**: they set `<Seo>` / `PAGE_META`, optionally inject JSON-LD, and compose sections or feature components. They do not embed business rules or raw content strings when avoidable.

| Page | Path | Highlights |
|------|------|------------|
| `HomePage` | `/` | 11 sections + `CtaSection`; `localBusinessSchema` + FAQ schema |
| `ServicesPage` | `/services` | Service catalog from `data/services`; `ServiceCard` feature |
| `ServiceDetailPage` | `/services/:slug` | Full service profile (inclusions, add-ons, coverage) via `useService`; every CTA links to `/booking?service=<id>` so the wizard opens pre-selected. Service + Breadcrumb schema |
| `AboutPage` | `/about` | Company story from `data/company` |
| `ContactPage` | `/contact` | `ContactForm`, `NewsletterForm` |
| `FaqPage` | `/faq` | Full FAQ + accordion; FAQ schema |
| `CareersPage` | `/careers` | Open roles from `data/careers` |
| `PrivacyPage` / `TermsPage` | `/privacy`, `/terms` | Two one-line wrappers over the shared `LegalDocument` renderer (see §6.1) |
| `BookingPage` | `/booking` | Hosts `BookingWizard` inside `EmptyLayout` |
| `SignInPage` / `SignUpPage` | `/signin`, `/signup` | `AuthShell`, RHF + localized Zod schemas |
| `NotFoundPage` | `*` | 404 within marketing chrome |

### Home page sections (`pages/Home/sections/`)

Composed in narrative order on `HomePage`:

1. `HeroSection` — Primary value prop and CTA
2. `TrustedBySection` — Social proof / logos
3. `ServicesOverviewSection` — Service highlights
4. `WhyCasaCleanSection` — Differentiators
5. `WorkflowSection` — How it works (high level)
6. `ProcessTimelineSection` — Step timeline from `data/process`
7. `BeforeAfterSection` — Visual proof
8. `StatsSection` — Metrics with `AnimatedNumber` / `useCountUp`
9. `TestimonialsSection` — `TestimonialsCarousel` feature
10. `FaqPreviewSection` — Subset of FAQs with link to full FAQ
11. (Page-level) `CtaSection` — Conversion block

Each section is independently maintainable and can be reordered or A/B tested without touching a monolithic home component.

### 6.1 Legal pages (`pages/Legal/` + `data/legal/`)

The privacy policy and terms of service are **content as data**, rendered by one component:

- `data/legal/en.js` and `data/legal/it.js` hold each document as `{ title, updated, intro, sections[] }`, where a section is `{ id, heading, blocks[] }` and a block is `{ type: "p" | "ul" | "table" }`. Company identity is read from `SITE` rather than retyped, so registered details can't drift from the rest of the site.
- `pages/Legal/LegalDocument.jsx` renders any of them: hero, a table of contents **derived** from the sections (so it can't fall out of step with the headings), and the blocks. `PrivacyPage`/`TermsPage` are one-liners passing `kind`, which keeps one lazy chunk per route.
- Section `id`s are identical across languages, so a deep link (`/terms#pricing`) survives a language switch.

**Two languages, not five.** The UI ships in five locales; the legal documents are authored in English and Italian only. An operative document translated loosely is worse than one honestly labelled, so `data/legal/index.js` resolves the reader's locale to a *published* one and returns `isFallback`, which the page uses to show an explicit "published in English and Italian only" notice. This is why the documents don't go through `t()` — the i18n fallback is silent by design, and here the fallback has to be disclosed. The Italian version is the one that prevails (see the Language clause), so substantive edits start there.

`data/legal/legal.test.js` locks the two languages to the same structure (section ids and order, block types, bullet and table-row counts), because the real failure mode is a clause added to one language and forgotten in the other. `pages/Legal/LegalDocument.test.jsx` covers the wiring: right language served, fallback notice shown only when it should be, ToC matching the sections.

---

## 7. Feature modules (`src/features/`)

Features are **self-contained vertical slices**: API functions, validation schemas, hooks, and UI that belong to one product domain.

### 7.1 Booking (`features/booking/`)

The most complex front-end domain — a **five-step wizard** (property → preferences → schedule → contact → review) plus confirmation.

**Architecture (dual state model):**

| Concern | Owner | Implementation |
|---------|--------|----------------|
| Field values | React Hook Form | Single `bookingSchema` (Zod), `FormProvider`, `mode: "onTouched"` |
| Step navigation | React Context + reducer | `BookingProvider` / `useBookingNav` — step index, direction, `maxReached` for progress clicks |
| Quote | Pure function | `utils/pricing.js` → `computeQuote(values)` |
| Submission | TanStack Query | `useCreateBooking` → `createBooking` API |

**Per-step validation:** `BOOKING_STEPS[].fields` lists which schema keys to `trigger()` before `next()`. Full schema validates on final submit.

**Step guards:** a rule that spans fields *and* fetched data can't live in the flat schema, so a step may register one with `useStepGuard(stepId, fn)` (BookingContext) and `next()` refuses while it returns false. `ScheduleStep` uses it for the slot: the customer types any minute (12:20), and `utils/timeWindow.js` validates it against the **48-hour advance notice** (waived by the chosen service's `allowInstantBooking`), the chosen city's opening hours, and whether the entered duration still finishes before closing — the same four rules `assertBookingWindow` enforces server-side, which stays the authority.

**Duration:** collected as two numeric inputs — an *Hours* field and a *Minutes* field (0–59) — on `PreferencesStep`, combined by `utils/duration.js` `combineDuration()` into the **total minutes** the API takes (`durationMinutes: 85` for 1 h 25 min). There is no duration dropdown and no free-text or decimal spelling. Displayed through `formatDuration(t, minutes)` — "1 h 25 min", never "85" or "1.42". The admin panel uses the same pair behind the `ResourceModal` `"duration"` field type, and imports the same helpers from the feature barrel. `durationInMinutes(record)` reads either the canonical field or a legacy record's `hours`.

**Step components:** `PropertyStep`, `PreferencesStep`, `ScheduleStep`, `ContactStep`, `ReviewStep`, `ConfirmationStep`.

**UI helpers:** `BookingProgress`, `BookingSummary` (live quote sidebar), `ToggleCard`.

**Pricing engine:** `total = rate pro-rated over the booked minutes × cleaners + add-ons`, computed in **integer cents and rounded once** so the quote matches the server's `computeBookingTotal` to the cent (85 min at €20/h is €28.33, never €28.34). Rate comes from the live service catalogue by `serviceId`; add-ons and tools from their catalogues.

**API mapping:** `toBookingPayload(values, quote)` maps camelCase form fields to snake_case API body (`service_id`, `customer_email`, `total_amount`, etc.).

**Graceful degradation:** If POST `/bookings` returns 404 or network error (`status === 0`), the client simulates a confirmed booking with id `CC-XXXXXX` so demos and static previews complete the UX. Real validation errors from a live API still propagate.

**Draft persistence key:** `BOOKING_STORAGE_KEY` (`casaclean:booking-draft`) is defined for optional draft save (hook-up point).

### 7.2 Contact (`features/contact/`)

- `ContactForm` — lead submission with Zod (`contactSchema`)
- `NewsletterForm` — email subscribe
- `contactApi.js` — `postWithGracefulFallback` (same 404/0 pattern as booking)
- `useSubmitContact`, `useSubscribeNewsletter` — mutation hooks

### 7.3 Auth (`features/auth/`)

- `AuthShell` — split-screen layout for sign-in/up
- `GoogleButton` — OAuth affordance (UI; integration depends on backend)
- `makeSignInSchema(t)` / `makeSignUpSchema(t)` — **factory schemas** taking translator `t` for localized error messages
- `useSignIn`, `useSignUp` — mutations against `ENDPOINTS.auth`

Password rules on sign-up: min 8 chars, uppercase, digit, confirm match.

### 7.4 Services and testimonials

- `ServiceCard`, `TestimonialsCarousel` — reusable cards/carousels fed by `data/` modules
- Prices are surfaced per service on `ServiceCard` and `ServiceDetailPage`, read from the live catalogue via `useServices` — there is no separate pricing page.

---

## 8. Design system (`components/ui/` + `styles/`)

### Token layer (`styles/globals.css`)

Tailwind v4 `@theme` defines the entire brand language:

- **brand** — seafoam-teal scale (50–950)
- **accent** — amber highlights
- **ink** — warm slate typography/surfaces
- **sand** — section backgrounds
- **Fonts** — Inter (body), Plus Jakarta Sans (display)
- **Radius**, **shadow** ladder (soft → premium), **ease-premium** / **ease-spring**
- **Breakpoints** — Tailwind's defaults plus three of our own: `3xl` (112rem) at
  the top, and **`xs` (25rem / 400px)** and **`2xs` (20rem / 320px)** at the
  bottom. `sm` is Tailwind's smallest stop at 640px, so a 320px phone and a 430px
  one otherwise share one set of base styles; `xs:` marks what needs the extra
  40-odd pixels, leaving the base declaration as the one the smallest screen
  gets. It exists for the dense surfaces — the admin panel's KPI grids, filter
  bars and detail rows, the profile's cards, and the `Modal` / `Pagination`
  primitives every page shares — where side-by-side layouts stop fitting below
  400px. `2xs` is the second stop, for the few places that survive a 360px phone
  but not the 200px floor (the profile's identity header, the footer's link
  columns). Write the narrow case as the base and opt back in at `xs`, never the
  reverse; reach for `2xs` only after measuring that the base case needs it.

  Both small stops are **named in `@theme`, never written inline as
  `min-[20rem]:`** — and that is load-bearing. Tailwind sorts named breakpoint
  variants by value (`2xs` → `xs` → `sm`), but emits arbitrary `min-[…]` variants
  after *all* of them, so `min-[20rem]:gap-4 sm:gap-5` silently resolves to
  `gap-4` on a desktop. Container queries (`@container` + `@min-[…]:`) don't
  share that hazard — they live in their own at-rule — and are the right tool
  when a component's layout depends on its own column rather than the window;
  `PhoneInput` and `NewsletterForm` both use one.

**The layout floor is 200px** — no surface may scroll sideways above it. Three
things set that floor in practice, so they are worth knowing before adding UI:
a bare `<input>` carries an intrinsic ~20-character width (the primitives pass
`min-w-0` for exactly this reason, and a raw one in a flex row still needs it); a
`Button` label is `whitespace-nowrap` only from `xs` up, and wraps below it
rather than escaping its container; and any control row that mixes fixed widths
(a filter bar, a badge-and-total header) needs `flex-wrap`, because `min-width`
beats `flex-shrink` and the overflow lands on the page, not the row.

Supporting sheets: `typography.css` (type scale utilities), `utilities.css` (layout helpers like `sr-only-focusable`), `animations.css` (CSS-level motion; respects `prefers-reduced-motion`).

### UI primitives (barrel: `components/ui/index.js`)

| Primitive | Typical use |
|-----------|-------------|
| `Button` | Variants, sizes, `loading`, `leftIcon` / `rightIcon` |
| `Input`, `Textarea`, `Select` | Form controls with error states |
| `PhoneInput` | Country picker + national number; controlled (`value`/`onChange` with the joined `+39…` string, so react-hook-form drives it through `<Controller>`, not `register`). Country list and parsing live in `lib/phone.js` |
| `Checkbox`, `Radio`, `Switch` | Boolean / single-choice inputs |
| `Card`, `Badge`, `Image` | Content containers and media |
| `Accordion`, `Tabs` | FAQ, settings-style UI |
| `Modal`, `Drawer` | Overlays |
| `Tooltip` | Contextual help |
| `Pagination` | List paging |
| `Spinner`, `Skeleton`, `EmptyState` | Loading and empty UX |
| `Container` | Max-width page gutters |

Primitives are built for **accessibility**: focus-visible rings, ARIA on interactive elements, semantic pairing with labels in feature forms.

### Shared composites (`components/shared/`)

- `Page` — Consistent page wrapper + optional motion
- `Reveal` — Scroll-triggered entrance (intersection-based)
- `SectionHeading` — Title + subtitle pattern
- `Logo`, `Icon` (registry), `StarRating`, `AnimatedNumber`
- `ScrollToTop` — Route change scroll reset
- `PageLoader` — Suspense fallback
- `ErrorBoundary` — Documented above

### Layout components (`components/layout/`)

- `Navbar` — Primary nav from `constants/navigation.js`, CTA to booking
- `Footer` — Links, social, legal
- `MobileMenu` — Drawer-based mobile nav with scroll lock hook
- `LanguageSwitcher` — Bound to `I18nProvider`

### Section blocks (`components/sections/`)

- `PageHero` — Interior page headers
- `CtaSection` — Reusable conversion band

---

## 9. Motion and animation

### Global (`MotionProvider`)

Framer `MotionConfig` with `reducedMotion="user"` so OS “reduce motion” disables non-essential animation tree-wide.

### Page transitions (`routes.jsx`)

`AnimatePresence` on pathname changes — coordinated with lazy route loading.

### Feature-level

- Booking wizard: directional step slide (`stepVariants`, `EASE_PREMIUM` from `animations/tokens.js`)
- Home/marketing: `Reveal`, stagger utilities in `animations/stagger.js`, `fade.js`, `slide.js`

### Hooks

- `usePrefersReducedMotion` — JS mirror of CSS media query
- `useIntersection` — Reveal triggers
- `useCountUp` — Stat section number animation

---

## 10. Data and content layer (`src/data/`)

Static content modules act as a **local CMS** until a headless CMS or API drives marketing copy:

| Module | Content |
|--------|---------|
| `services.js` | Cleaning SKUs, rates, descriptions |
| `faq.js` | Q&A pairs |
| `testimonials.js` | Reviews for carousel |
| `cities.js` | Service areas for booking |
| `company.js`, `careers.js`, `stats.js`, `process.js` | About, jobs, metrics, timeline |
| `legal/` | Privacy policy and terms of service, in English and Italian (§6.1) |

`utils/generateSlug.js` supports service URL consistency. Pages import from `@/data` or specific files — never inline long copy in route components.

---

## 11. HTTP client and API integration (`services/api/`)

### Axios instance (`axios.js`)

- `baseURL` from `VITE_API_BASE_URL`
- `timeout: 15000`
- `withCredentials: true` — sends httpOnly auth cookie from API
- `request()` helper unwraps `{ data: { data } }` envelope when present

### Endpoints map (`endpoints.js`)

Centralized paths for `auth`, `contact` and `newsletter` — parameterized routes as functions (`detail(id)`). Booking, payment and admin features keep their paths in their own `features/<domain>/api/*Api.js`.

### Interceptors (`interceptors.js`)

- Request: metadata hook (correlation id extension point)
- Response error: `normalizeError()` → `{ status, message, code, fields }` for uniform UI handling

Feature modules call **`request` + `ENDPOINTS`**, never raw axios in components.

---

## 12. Internationalization (`src/i18n/`)

| Piece | Role |
|-------|------|
| `config.js` | `LANGUAGES` (en, ka, it), `resolveLocale()`, storage key |
| `locales/en.js`, `ka.js`, `it.js` | Nested translation dictionaries |
| `context.js` | `translate(locale, key, vars)` with interpolation |
| `I18nProvider` | Hydrates from `localStorage` → `navigator.language` → default |
| `useTranslation` | Consumer hook: `{ t, locale, setLocale, languages }` |

Auth validation uses **schema factories** `makeSignInSchema(t)` so error strings respect active locale. `document.documentElement.lang` and `dir` update on locale change (RTL-ready via `dir` on language metadata).

---

## 13. SEO and discoverability (`src/seo/` + `public/`)

### Per-page `<Seo>` component

Combines `MetaTags` (title, description, canonical, Open Graph, Twitter) and optional `SchemaMarkup` (JSON-LD).

### Structured data builders (`StructuredData.js`)

Pure functions (testable, framework-free):

- `organizationSchema`, `websiteSchema` — global (in `App.jsx`)
- `localBusinessSchema`, `faqSchema` — home / FAQ
- `serviceSchema`, `breadcrumbSchema` — services

Site constants from `constants/metadata.js` (`SITE`, `PAGE_META`).

### Static files

- `public/robots.txt`
- `public/sitemap.xml`
- `index.html` — baseline meta, `theme-color`, Google Fonts preconnect

`VITE_SITE_URL` drives canonical and OG absolute URLs.

---

## 14. Cross-cutting hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useDebounce` | Input debouncing (search, filters) |
| `useLocalStorage` | Persistent client preferences |
| `useMediaQuery` / `useIsMobile` / `useIsDesktop` | Responsive behavior |
| `usePrefersReducedMotion` | A11y-aware animation gating |
| `useScrollPosition` | Navbar transparency / shrink |
| `useIntersection` | Reveal on scroll |
| `useCountUp` | Animated statistics |
| `useScrollLock` | Mobile menu body scroll lock |

---

## 15. Build, performance, and quality

### Vite configuration highlights

- `@` → `./src` alias
- `build.target: es2020`
- **Manual chunks** for cacheable vendors:
  - `motion` — framer-motion
  - `query` — TanStack Query
  - `forms` — RHF, resolvers, zod
  - `react-vendor` — react, react-dom, react-router

### Performance practices

- Route-level code splitting (every page lazy)
- CSS code splitting enabled
- Lucide icons imported by name (no barrel `import *`)
- Font preconnect in `index.html`

### Accessibility practices

- Skip link in `MainLayout`
- `prefers-reduced-motion` in CSS + Framer config
- Focus-visible styling on primitives
- Semantic landmarks (`main`, labeled forms)
- `sr-only-focusable` utility for screen-reader-only interactive elements

### Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Production bundle
npm run preview  # Serve dist
npm run lint     # ESLint (React hooks + refresh plugins)
```

---

## 16. Key architectural decisions (summary)

1. **Composition over god-components** — Pages compose sections; sections compose primitives.
2. **Single sources of truth** — Routes, design tokens, and marketing content each live in one module.
3. **Open/closed routing** — New pages = lazy import + one `MAIN_ROUTES` row.
4. **Separated wizard state** — RHF for fields, reducer context for navigation; per-step `trigger()` on field subsets.
5. **Graceful API degradation** — Booking and contact flows succeed in preview when API is down; real errors still surface when API is live.
6. **Feature slices** — Booking/contact/auth colocate API, validation, hooks, and UI.
7. **Senior-ready SEO/i18n** — Not bolted on; structured data and locales are first-class modules.

---

## 17. What is intentionally not in the client (yet)

- `DashboardLayout` is scaffolded but **not registered** in `routeConfig`
- `ROUTES.privacy` and `ROUTES.terms` exist in constants but **no pages** are wired
- Google OAuth button is UI-ready; full OAuth flow depends on backend configuration

These gaps are useful when planning the next front-end milestones without surprises.

---

## 18. Quick reference: where to change what

| Goal | Location |
|------|----------|
| Add a marketing route | `app/router/routeConfig.js`, `constants/routes.js`, new `pages/*` |
| Change nav links | `constants/navigation.js` |
| Edit service copy or rates | `data/services.js`, `features/booking/constants.js` |
| Adjust brand colors | `styles/globals.css` `@theme` |
| Booking validation rules | `features/booking/validation/bookingSchema.js` |
| API base URL | `.env` → `VITE_API_BASE_URL` |
| Page title/description | `constants/metadata.js` → `PAGE_META` |
| Translations | `i18n/locales/*.js` |
| New UI primitive | `components/ui/<Name>/`, export from `components/ui/index.js` |

---

*Document version aligns with the `client/` tree as of the CasaClean front-end implementation. For run instructions, see `client/README.md`.*
