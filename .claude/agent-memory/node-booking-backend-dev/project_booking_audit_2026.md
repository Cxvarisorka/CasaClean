---
name: booking-audit-2026
description: Key design decisions and invariants established during the June 2026 booking system security audit
metadata:
  type: project
---

In June 2026, a 13-fix security audit was applied to the booking system. Key decisions that affect future work:

**totalAmount is now fully server-managed.** It is computed as `service.pricePerHour * hours + sum(specialRequest.price)`. It must never be accepted from the client. It is absent from both `createBookingSchema` and `editBookingSchema`. The `editBooking` controller does NOT recompute it — an admin editing a booking does not trigger price recalculation.

**Why:** Clients could previously supply any totalAmount, allowing free or arbitrarily-priced bookings.

**customerName and customerEmail are server-managed.** Always derived from `req.user.fullname` / `req.user.email`. Removed from `createBookingSchema`. The old "admin may override" comment was retired.

**Why:** Mass-assignment of identity fields; the authenticated user's own profile is authoritative.

**resolveServiceAndCity now returns `{ service, city }` (was just `service`).** Service select now includes `pricePerHour`. City select now includes `workingHourStarts` and `workingHourEnds`. Any caller that destructures the old plain `service` return value must be updated.

**resolveSpecialRequests now returns full documents (was just id strings).** Callers that need only ids must map `resolvedDocs.map(sr => sr._id)`. The Booking.create call was updated accordingly.

**bookingTime is validated against city working hours** in `createBooking`. Uses lexicographic string comparison on zero-padded "HH:MM" strings (semantically equivalent to numeric). The city's `workingHourEnds` is exclusive (`>=` check).

**Review gate now requires status === 'completed'.** `Booking.findOne({ user, serviceId, status: 'completed' })` — pending/cancelled bookings no longer qualify.

**bookingLimiter**: 20 req / 15 min / IP on `POST /booking`. Exported from `rateLimit.middleware.js`, applied as first middleware in the `POST /` route (before `protect`).

**How to apply:** When adding any feature that touches booking pricing, identity fields, or special requests: verify these fields remain server-managed and that resolvers return the right shape (full docs vs ids).
