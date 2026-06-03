# CasaClean Client — Front-End Architecture & Implementation Reference

This document describes everything implemented under the `client/` folder: the marketing site, booking funnel, authentication surfaces, design system, data layer, SEO, internationalization, and API integration. It is scoped exclusively to the front end and written for senior engineers onboarding to or reviewing the codebase.

---

## 1. Product scope

The client is a **production-grade marketing and booking application** for **CasaClean** — a premium turnover-cleaning service for vacation rentals (Airbnb hosts, property managers, short-term rental operators). It is not a minimal landing page; it is a full multi-route SPA with:

- A narrative **home page** composed of eleven independent sections
- **Services**, **pricing**, **about**, **FAQ**, **careers**, and **blog** (list + dynamic post routes)
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
    ├── constants/          # routes, navigation, metadata, pricing, faq
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

All path strings are defined once as `ROUTES` (including parameterized helpers `blogPost(slug)`, `serviceDetail(slug)`). Navigation, links, and `routeConfig` import from here — no duplicated path literals.

### Route table (`app/router/routeConfig.js`)

Every page is **`React.lazy` imported** — one async chunk per route. Routes are grouped by layout:

| Group | Layout | Routes |
|-------|--------|--------|
| `MAIN_ROUTES` | `MainLayout` (Navbar + Footer) | `/`, `/services`, `/pricing`, `/about`, `/contact`, `/faq`, `/careers`, `/blog`, `/blog/:slug` |
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
| `PricingPage` | `/pricing` | Plans from `data/pricing`; `PricingCard` |
| `AboutPage` | `/about` | Company story from `data/company` |
| `ContactPage` | `/contact` | `ContactForm`, `NewsletterForm` |
| `FaqPage` | `/faq` | Full FAQ + accordion; FAQ schema |
| `CareersPage` | `/careers` | Open roles from `data/careers` |
| `BlogPage` | `/blog` | Post grid via `useBlogPosts` |
| `BlogPostPage` | `/blog/:slug` | Single post; Article + Breadcrumb schema |
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

**Step components:** `PropertyStep`, `PreferencesStep`, `ScheduleStep`, `ContactStep`, `ReviewStep`, `ConfirmationStep`.

**UI helpers:** `BookingProgress`, `BookingSummary` (live quote sidebar), `ToggleCard`, `OptionGroup`.

**Pricing engine:** `total = rate × hours × cleaners + add-ons` where rate comes from `data/services` by `serviceId`; add-ons from `ADDITIONAL_SERVICES` constant.

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

### 7.4 Blog (`features/blog/`)

- `BlogCard` presentation component
- `useBlogPosts`, `useBlogPost` — hooks over local `data/blog` (CMS-ready shape)

### 7.5 Services, pricing, testimonials

- `ServiceCard`, `PricingCard`, `TestimonialsCarousel` — reusable cards/carousels fed by `data/` modules

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

Supporting sheets: `typography.css` (type scale utilities), `utilities.css` (layout helpers like `sr-only-focusable`), `animations.css` (CSS-level motion; respects `prefers-reduced-motion`).

### UI primitives (barrel: `components/ui/index.js`)

| Primitive | Typical use |
|-----------|-------------|
| `Button` | Variants, sizes, `loading`, `leftIcon` / `rightIcon` |
| `Input`, `Textarea`, `Select` | Form controls with error states |
| `Checkbox`, `Radio`, `Switch` | Boolean / single-choice inputs |
| `Card`, `Badge`, `Image` | Content containers and media |
| `Accordion`, `Tabs` | FAQ, settings-style UI |
| `Modal`, `Drawer` | Overlays |
| `Tooltip` | Contextual help |
| `Pagination` | Blog/list paging |
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
| `pricing.js` | Plan tiers |
| `faq.js` | Q&A pairs |
| `testimonials.js` | Reviews for carousel |
| `blog.js` | Posts with slugs, excerpts, body |
| `cities.js` | Service areas for booking |
| `company.js`, `careers.js`, `stats.js`, `process.js` | About, jobs, metrics, timeline |

`utils/generateSlug.js` supports blog URL consistency. Pages import from `@/data` or specific files — never inline long copy in route components.

---

## 11. HTTP client and API integration (`services/api/`)

### Axios instance (`axios.js`)

- `baseURL` from `VITE_API_BASE_URL`
- `timeout: 15000`
- `withCredentials: true` — sends httpOnly auth cookie from API
- `request()` helper unwraps `{ data: { data } }` envelope when present

### Endpoints map (`endpoints.js`)

Centralized paths for `auth`, `services`, `cities`, `bookings`, `leads`, `contact`, `newsletter`, `blog` — parameterized routes as functions (`detail(id)`).

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
- `localBusinessSchema`, `faqSchema` — home / pricing / FAQ
- `serviceSchema`, `articleSchema`, `breadcrumbSchema` — services / blog

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
- `serviceDetail(slug)` route constant exists; dedicated service detail **page route** may be future work
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
