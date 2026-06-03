import { lazy } from "react";
import { ROUTES } from "@/constants/routes";

/*
 * Route configuration
 * -------------------
 * A single declarative table describing every route: its path, the lazily
 * imported page component, and which layout hosts it. routes.jsx renders this
 * table, so adding a page is a one-line, data-only change (open/closed).
 *
 * Every page is code-split via React.lazy → each route is its own chunk.
 */

// --- Lazy page imports (one chunk per page) --------------------------------
const HomePage = lazy(() => import("@/pages/Home/HomePage"));
const ServicesPage = lazy(() => import("@/pages/Services/ServicesPage"));
const PricingPage = lazy(() => import("@/pages/Pricing/PricingPage"));
const AboutPage = lazy(() => import("@/pages/About/AboutPage"));
const ContactPage = lazy(() => import("@/pages/Contact/ContactPage"));
const FaqPage = lazy(() => import("@/pages/FAQ/FaqPage"));
const CareersPage = lazy(() => import("@/pages/Careers/CareersPage"));
const BlogPage = lazy(() => import("@/pages/Blog/BlogPage"));
const BlogPostPage = lazy(() => import("@/pages/Blog/BlogPostPage"));
const BookingPage = lazy(() => import("@/pages/Booking/BookingPage"));
const SignInPage = lazy(() => import("@/pages/Auth/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/Auth/SignUpPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFound/NotFoundPage"));

/** Routes hosted by the marketing MainLayout (Navbar + Footer). */
export const MAIN_ROUTES = [
  { path: ROUTES.home, element: HomePage, index: true },
  { path: ROUTES.services, element: ServicesPage },
  { path: ROUTES.pricing, element: PricingPage },
  { path: ROUTES.about, element: AboutPage },
  { path: ROUTES.contact, element: ContactPage },
  { path: ROUTES.faq, element: FaqPage },
  { path: ROUTES.careers, element: CareersPage },
  { path: ROUTES.blog, element: BlogPage },
  { path: ROUTES.blogPost(), element: BlogPostPage },
];

/** Routes hosted by the focused EmptyLayout (minimal branded header). */
export const FOCUSED_ROUTES = [{ path: ROUTES.booking, element: BookingPage }];

/** Standalone routes that own their full-screen chrome (auth split-screen). */
export const BARE_ROUTES = [
  { path: ROUTES.signin, element: SignInPage },
  { path: ROUTES.signup, element: SignUpPage },
];

export const FALLBACK_ROUTE = { path: ROUTES.notFound, element: NotFoundPage };
