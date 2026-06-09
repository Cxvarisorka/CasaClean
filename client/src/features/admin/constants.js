import {
  LayoutDashboard,
  CalendarCheck,
  Sparkles,
  ListPlus,
  MapPin,
  Map,
  Users,
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
  { to: ROUTES.admin.coverage, label: "Coverage map", labelKey: "admin.nav.coverage", icon: Map },
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
