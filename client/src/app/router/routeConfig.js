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

/*
 * --- Lazy page imports (one chunk per page) --------------------------------
 * The importers are named rather than inlined into lazy() so the same function
 * can serve both purposes: React.lazy renders it, and PREFETCH_BY_PATH below
 * lets the navigation warm a chunk on hover, before the click.
 */
const load = {
  home: () => import("@/pages/Home/HomePage"),
  services: () => import("@/pages/Services/ServicesPage"),
  serviceDetail: () => import("@/pages/Services/ServiceDetailPage"),
  about: () => import("@/pages/About/AboutPage"),
  contact: () => import("@/pages/Contact/ContactPage"),
  faq: () => import("@/pages/FAQ/FaqPage"),
  careers: () => import("@/pages/Careers/CareersPage"),
  privacy: () => import("@/pages/Legal/PrivacyPage"),
  terms: () => import("@/pages/Legal/TermsPage"),
  booking: () => import("@/pages/Booking/BookingPage"),
  signin: () => import("@/pages/Auth/SignInPage"),
  signup: () => import("@/pages/Auth/SignUpPage"),
  forgotPassword: () => import("@/pages/Auth/ForgotPasswordPage"),
  resetPassword: () => import("@/pages/Auth/ResetPasswordPage"),
  adminLogin: () => import("@/pages/Auth/AdminLoginPage"),
  profile: () => import("@/pages/Profile/ProfilePage"),
  notFound: () => import("@/pages/NotFound/NotFoundPage"),
};

const HomePage = lazy(load.home);
const ServicesPage = lazy(load.services);
const ServiceDetailPage = lazy(load.serviceDetail);
const AboutPage = lazy(load.about);
const ContactPage = lazy(load.contact);
const FaqPage = lazy(load.faq);
const CareersPage = lazy(load.careers);
const PrivacyPage = lazy(load.privacy);
const TermsPage = lazy(load.terms);
const BookingPage = lazy(load.booking);
const SignInPage = lazy(load.signin);
const SignUpPage = lazy(load.signup);
const ForgotPasswordPage = lazy(load.forgotPassword);
const ResetPasswordPage = lazy(load.resetPassword);
const AdminLoginPage = lazy(load.adminLogin);
const ProfilePage = lazy(load.profile);
const NotFoundPage = lazy(load.notFound);

// Admin console — its own bundle, only loaded when /admin is visited.
const AdminLayout = lazy(() =>
  import("@/features/admin/components/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const AdminDashboardPage = lazy(() => import("@/pages/Admin/DashboardPage"));
const AdminBookingsPage = lazy(() => import("@/pages/Admin/BookingsPage"));
const AdminSubscriptionsPage = lazy(() => import("@/pages/Admin/SubscriptionsPage"));
const AdminCalendarPage = lazy(() => import("@/pages/Admin/CalendarPage"));
const AdminServicesPage = lazy(() => import("@/pages/Admin/ServicesPage"));
const AdminSpecialRequestsPage = lazy(() => import("@/pages/Admin/SpecialRequestsPage"));
const AdminCleaningToolsPage = lazy(() => import("@/pages/Admin/CleaningToolsPage"));
const AdminCitiesPage = lazy(() => import("@/pages/Admin/CitiesPage"));
const AdminCoverageMapPage = lazy(() => import("@/pages/Admin/CoverageMapPage"));
const AdminUsersPage = lazy(() => import("@/pages/Admin/UsersPage"));
const AdminWorkersPage = lazy(() => import("@/pages/Admin/WorkersPage"));
const AdminQualityPage = lazy(() => import("@/pages/Admin/QualityPage"));
const AdminMessagesPage = lazy(() => import("@/pages/Admin/MessagesPage"));

/*
 * Route warm-up
 * -------------
 * A protected route can't render until `GET /auth/me` resolves, which also
 * delays its page chunk and every request that chunk would make. `warm` runs as
 * soon as the guard mounts, so the parts that don't depend on the session — the
 * chunk itself and the public catalogue — travel alongside it instead of after.
 * Both imports are dynamic so none of this lands in the entry bundle.
 */
const warmBooking = (queryClient) => {
  load.booking();
  import("@/features/booking/prefetchCatalogue").then((m) =>
    m.prefetchBookingCatalogue(queryClient)
  );
};

/*
 * Path → chunk loader, for warming a route before it is navigated to. A hover
 * or keyboard focus is a strong signal and buys the ~200-300 ms the chunk would
 * otherwise cost after the click. Dynamic imports are cached by the browser and
 * the bundler runtime, so calling these repeatedly is free.
 */
const PREFETCH_BY_PATH = {
  [ROUTES.home]: load.home,
  [ROUTES.services]: load.services,
  [ROUTES.about]: load.about,
  [ROUTES.contact]: load.contact,
  [ROUTES.faq]: load.faq,
  [ROUTES.careers]: load.careers,
  [ROUTES.privacy]: load.privacy,
  [ROUTES.terms]: load.terms,
  [ROUTES.booking]: load.booking,
  [ROUTES.signin]: load.signin,
  [ROUTES.signup]: load.signup,
  [ROUTES.profile]: load.profile,
};

/** Warm the chunk behind a path. Unknown paths (e.g. /services/:slug) no-op. */
export function prefetchRoute(path) {
  PREFETCH_BY_PATH[path]?.();
}

/** Routes hosted by the marketing MainLayout (Navbar + Footer). */
export const MAIN_ROUTES = [
  { path: ROUTES.home, element: HomePage, index: true },
  { path: ROUTES.services, element: ServicesPage },
  { path: ROUTES.serviceDetail(), element: ServiceDetailPage },
  { path: ROUTES.about, element: AboutPage },
  { path: ROUTES.contact, element: ContactPage },
  { path: ROUTES.faq, element: FaqPage },
  { path: ROUTES.careers, element: CareersPage },
  { path: ROUTES.privacy, element: PrivacyPage },
  { path: ROUTES.terms, element: TermsPage },
  // Account area — requires a registered, signed-in user.
  { path: ROUTES.profile, element: ProfilePage, protected: true },
];

/** Routes hosted by the focused EmptyLayout (minimal branded header). */
export const FOCUSED_ROUTES = [
  // Booking requires a registered, signed-in user.
  { path: ROUTES.booking, element: BookingPage, protected: true, warm: warmBooking },
];

/** Standalone routes that own their full-screen chrome (auth split-screen). */
export const BARE_ROUTES = [
  { path: ROUTES.signin, element: SignInPage },
  { path: ROUTES.signup, element: SignUpPage },
  // Password recovery — public by nature (the user can't sign in). The reset
  // page is opened from the one-time link in the email.
  { path: ROUTES.forgotPassword, element: ForgotPasswordPage },
  { path: ROUTES.resetPassword(), element: ResetPasswordPage },
  // Dedicated admin login. Declared as a standalone full-path route (not a child
  // of the guarded /admin shell) so it stays reachable when AdminRoute redirects
  // an unauthenticated visitor here — otherwise the guard would loop.
  { path: ROUTES.admin.login, element: AdminLoginPage },
];

/** The admin shell + its child pages (nested under /admin, guarded inside). */
export const ADMIN_LAYOUT = AdminLayout;
export const ADMIN_ROUTES = [
  { path: "", element: AdminDashboardPage, index: true },
  { path: "bookings", element: AdminBookingsPage },
  { path: "subscriptions", element: AdminSubscriptionsPage },
  { path: "calendar", element: AdminCalendarPage },
  { path: "services", element: AdminServicesPage },
  { path: "special-requests", element: AdminSpecialRequestsPage },
  { path: "cleaning-tools", element: AdminCleaningToolsPage },
  { path: "cities", element: AdminCitiesPage },
  { path: "coverage", element: AdminCoverageMapPage },
  { path: "workers", element: AdminWorkersPage },
  { path: "quality", element: AdminQualityPage },
  { path: "messages", element: AdminMessagesPage },
  { path: "users", element: AdminUsersPage },
];

export const FALLBACK_ROUTE = { path: ROUTES.notFound, element: NotFoundPage };
