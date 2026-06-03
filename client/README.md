# CasaClean — Frontend

A production-grade marketing & booking front end for **CasaClean**, a premium
turnover-cleaning service for vacation rentals. Built as a scalable, feature-driven
React application.

---

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | React 19 (JavaScript, **no TypeScript**) |
| Build          | Vite                                    |
| Routing        | React Router v7 (lazy, code-split)      |
| Styling        | Tailwind CSS v4 (token-driven theme)    |
| Animation      | Framer Motion                           |
| Forms          | React Hook Form + Zod                   |
| Data fetching  | TanStack Query + Axios                  |
| SEO            | React Helmet Async + schema.org JSON-LD |
| Icons          | Lucide React                            |

## Getting started

```bash
npm install
cp .env.example .env      # set VITE_API_BASE_URL / VITE_SITE_URL
npm run dev               # start the dev server
npm run build             # production build
npm run preview           # serve the build
npm run lint              # eslint
```

The API base URL is read from `VITE_API_BASE_URL` and defaults to the local
CasaClean server (`http://localhost:8000/api/v1`).

---

## Architecture

The codebase follows **feature-driven architecture** with **atomic design** for
shared UI, and a strict separation between *content*, *presentation* and *logic*.

```
src/
├── app/            # Application shell
│   ├── providers/  # Query, Theme, Motion, Helmet, Router, ErrorBoundary
│   ├── layouts/    # MainLayout · EmptyLayout · DashboardLayout
│   └── router/     # Declarative route table + lazy pages + page transitions
│
├── pages/          # Route-level pages (thin orchestrators of sections)
│   └── Home/sections/   # Each home section is its own component
│
├── features/       # Self-contained domains (api · hooks · validation · store · components)
│   ├── booking/    # Multi-step wizard (RHF form state + nav store + pricing engine)
│   ├── blog/ · services/ · pricing/ · testimonials/ · contact/
│
├── components/
│   ├── ui/         # Atomic primitives (Button, Input, Card, Modal, Tabs, …)
│   ├── layout/     # Navbar · Footer · MobileMenu
│   ├── sections/   # Reusable page sections (PageHero, CtaSection)
│   └── shared/     # Cross-cutting composites (Reveal, SectionHeading, Seo helpers…)
│
├── hooks/          # Reusable behavior hooks (useMediaQuery, useIntersection, …)
├── services/api/   # Axios instance, endpoints map, interceptors
├── seo/            # MetaTags, SchemaMarkup, structured-data builders
├── animations/     # Framer Motion variant system + motion tokens
├── constants/      # Routes, navigation, site metadata
├── data/           # Local content store (services, blog, faq, testimonials…)
├── utils/          # Pure helpers (formatCurrency, formatDate, seoHelpers…)
└── styles/         # globals (theme tokens) · typography · utilities · animations
```

### Key design decisions

- **Composition over god-components.** Pages compose sections; sections compose
  primitives. No page owns layout *and* logic *and* content.
- **Single sources of truth.** Routes (`constants/routes.js`), the design system
  (`styles/globals.css` tokens), and content (`data/`) are each defined once.
- **Open/closed routing.** Adding a page is a one-line change to
  `app/router/routeConfig.js`; every route is its own lazy chunk.
- **Form vs. navigation state are separate.** The booking wizard uses RHF for
  field state and a small reducer-based context (`booking/store`) for step
  navigation — each concern stays simple and testable.
- **Graceful API degradation.** Lead/contact/booking submissions post to the API
  but resolve optimistically when an endpoint isn't provisioned, so the UX is
  always complete in preview environments.

### Performance & accessibility

- Route-level lazy loading and manual vendor chunking (motion/forms/query split
  out of the critical path); main entry chunk ≈ 25 kB gzip.
- Tree-shaken icons via an explicit registry (no `import *`).
- `prefers-reduced-motion` honored globally (CSS + Framer `MotionConfig`).
- Skip link, focus-visible rings, ARIA on every interactive primitive, semantic
  landmarks, and labeled form controls throughout.

### SEO

Every page ships a `<Seo>` block (title, description, canonical, Open Graph,
Twitter cards) plus relevant JSON-LD: Organization & WebSite (global),
LocalBusiness + FAQ (home/pricing/faq), Service (services), Article + Breadcrumb
(blog posts). `robots.txt` and `sitemap.xml` are in `public/`.
