import {
  LayoutDashboard,
  CalendarCheck,
  Sparkles,
  MapPin,
  Users,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

/*
 * Admin navigation
 * ----------------
 * Single declarative table that drives the sidebar. Adding a section is a
 * one-line change here — the sidebar renders whatever this exports.
 */

export const ADMIN_NAV = [
  { to: ROUTES.admin.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: ROUTES.admin.bookings, label: "Bookings", icon: CalendarCheck },
  { to: ROUTES.admin.services, label: "Services", icon: Sparkles },
  { to: ROUTES.admin.cities, label: "Cities", icon: MapPin },
  { to: ROUTES.admin.users, label: "Users", icon: Users },
];

export const BOOKING_STATUS_META = {
  pending: { label: "Pending", variant: "accent" },
  confirmed: { label: "Confirmed", variant: "brand" },
  in_progress: { label: "In progress", variant: "neutral" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "outline" },
};
