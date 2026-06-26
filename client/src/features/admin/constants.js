import {
  LayoutDashboard,
  CalendarCheck,
  Sparkles,
  ListPlus,
  MapPin,
  Map,
  Users,
  HardHat,
  Star,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

/*
 * Admin navigation
 * ----------------
 * Single declarative table that drives the sidebar. Adding a section is a
 * one-line change here — the sidebar renders whatever this exports. `labelKey`
 * resolves through i18n (admin.nav.*); `label` is the English fallback used for
 * non-localized contexts (e.g. the document title).
 */

export const ADMIN_NAV = [
  { to: ROUTES.admin.dashboard, label: "Dashboard", labelKey: "admin.nav.dashboard", icon: LayoutDashboard, end: true },
  { to: ROUTES.admin.bookings, label: "Bookings", labelKey: "admin.nav.bookings", icon: CalendarCheck },
  { to: ROUTES.admin.services, label: "Services", labelKey: "admin.nav.services", icon: Sparkles },
  { to: ROUTES.admin.specialRequests, label: "Special requests", labelKey: "admin.nav.specialRequests", icon: ListPlus },
  { to: ROUTES.admin.cities, label: "Cities", labelKey: "admin.nav.cities", icon: MapPin },
  { to: ROUTES.admin.coverage, label: "Bookings map", labelKey: "admin.nav.coverage", icon: Map },
  { to: ROUTES.admin.workers, label: "Workers", labelKey: "admin.nav.workers", icon: HardHat },
  { to: ROUTES.admin.quality, label: "Quality", labelKey: "admin.nav.quality", icon: Star },
  { to: ROUTES.admin.users, label: "Users", labelKey: "admin.nav.users", icon: Users },
];

// `label` is the English fallback; `labelKey` resolves through i18n
// (admin.status.*) wherever the status is rendered. These mirror the backend
// booking status enum exactly (booking.model.js) so a status change PATCHes a
// value the server accepts.
export const BOOKING_STATUS_META = {
  pending: { label: "Pending", labelKey: "admin.status.pending", variant: "accent" },
  confirmed: { label: "Confirmed", labelKey: "admin.status.confirmed", variant: "brand" },
  completed: { label: "Completed", labelKey: "admin.status.completed", variant: "success" },
  cancelled: { label: "Cancelled", labelKey: "admin.status.cancelled", variant: "outline" },
};

// Read-only payment posture badge (mirrors booking.model.js paymentStatus enum).
// 'manual' marks an offline/cash booking entered by an admin (no Stripe).
export const PAYMENT_STATUS_META = {
  paid: { label: "Paid", labelKey: "admin.payment.paid", variant: "success" },
  refunded: { label: "Refunded", labelKey: "admin.payment.refunded", variant: "outline" },
  manual: { label: "Manual / cash", labelKey: "admin.payment.manual", variant: "accent" },
  unpaid: { label: "Unpaid", labelKey: "admin.payment.unpaid", variant: "outline" },
};

// Map-marker / legend colour per booking status (bookings map). Lives here (not
// in the map component) so non-component modules can import it without tripping
// react-refresh's only-export-components rule.
export const STATUS_COLORS = {
  pending: "#e8a33d",
  confirmed: "#1dae9f",
  completed: "#16a34a",
  cancelled: "#9aa3b8",
};
