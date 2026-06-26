// Booking domain service
// ----------------------
// Shared, fail-closed booking logic used by both the booking controller (admin
// manual bookings, edits) and the payment controller (customer online bookings).
// Centralising it here means service/city/add-on resolution and SERVER-SIDE
// pricing live in exactly one place and are never duplicated or bypassed.

const mongoose = require('mongoose');

const SpecialRequest = require('../models/specialRequest.model');
const City = require('../models/city.model');
const Service = require('../models/service.model');

const AppError = require('../utils/appError.util');

/**
 * Validate the service/city pair selected for a booking.
 *
 * Fail-closed: both ids MUST be valid ObjectIds that resolve to an existing,
 * *enabled* Service/City document. When the service is offered only in specific
 * cities (allCities === false), the chosen city must be one of them.
 *
 * Returns { service, city } so callers can use service.pricePerHour for pricing
 * and city.workingHour* for the time-window check.
 */
const resolveServiceAndCity = async (serviceId, cityId) => {
  if (
    !mongoose.Types.ObjectId.isValid(serviceId) ||
    !mongoose.Types.ObjectId.isValid(cityId)
  ) {
    throw new AppError("Invalid service or city id!", 400);
  }

  const [service, city] = await Promise.all([
    Service.findById(serviceId)
      .select("name enabled allCities cities allSpecialRequests specialRequests pricePerHour")
      .lean(),
    City.findById(cityId)
      .select("enabled workingHourStarts workingHourEnds")
      .lean()
  ]);

  // Combined existence/enabled message so we don't leak existing-but-disabled
  // vs. non-existent.
  if (!service || !service.enabled) {
    throw new AppError("The selected service does not exist or is unavailable!", 400);
  }
  if (!city || !city.enabled) {
    throw new AppError("The selected city does not exist or is unavailable!", 400);
  }

  // Coverage: a city-restricted service must actually serve the chosen city.
  if (!service.allCities) {
    const covered = (service.cities || []).some(
      (c) => String(c) === String(cityId)
    );
    if (!covered) {
      throw new AppError("The selected service is not available in the chosen city!", 400);
    }
  }

  return { service, city };
};

/**
 * Validate the special-request add-ons selected for a booking.
 *
 * Returns the full resolved SpecialRequest documents (so callers can sum their
 * `price`). All ids must resolve to real, *enabled* catalogue items; when a
 * `service` is supplied and it restricts its add-ons (allSpecialRequests ===
 * false), every selected id must be one the service actually offers.
 */
const resolveSpecialRequests = async (ids, service = null) => {
  // Nothing selected is perfectly valid — special requests are optional.
  if (!ids) return [];

  if (!Array.isArray(ids)) {
    throw new AppError("specialRequests must be an array of ids!", 400);
  }

  if (ids.length === 0) return [];

  // Drop duplicates (e.g. the same add-on sent twice from the UI).
  const uniqueIds = [...new Set(ids.map(String))];

  if (!uniqueIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError("One or more special request ids are invalid!", 400);
  }

  const foundDocs = await SpecialRequest.find({
    _id: { $in: uniqueIds },
    enabled: true
  }).select("_id price").lean();

  if (foundDocs.length !== uniqueIds.length) {
    throw new AppError("One or more selected special requests do not exist or are unavailable!", 400);
  }

  // Service/add-on compatibility: a service that lists explicit add-ons may only
  // be booked with those add-ons.
  if (service && !service.allSpecialRequests) {
    const allowed = new Set((service.specialRequests || []).map(String));
    if (!uniqueIds.every((id) => allowed.has(id))) {
      throw new AppError("One or more selected special requests are not available for this service!", 400);
    }
  }

  return foundDocs;
};

/**
 * Validate, resolve and PRICE a customer self-booking, returning a fully-formed
 * draft ready to store (PendingBooking) and later persist (Booking.create).
 *
 * This is the single fail-closed entry point for the online payment flow: the
 * total is computed here from DB prices and is NEVER trusted from the client.
 * The customer is always the signed-in user — admin "on behalf" bookings go
 * through the separate manual-booking path — so identity is taken from `user`.
 *
 * @param {Object} payload  validated booking body (createBookingSchema shape)
 * @param {Object} user     req.user (the signed-in customer)
 * @returns {Promise<Object>} draft booking fields incl. server-computed totalAmount
 */
const buildValidatedBookingDraft = async (payload, user) => {
  const {
    serviceId, cityId, streetName, houseNumber, propertySize,
    doorbellName, bookingDate, bookingTime, hours, cleaners,
    notes, specialRequests, supplies
  } = payload;

  // Required-field guard (numeric fields checked against undefined so a legit 0
  // wouldn't be rejected — the Zod min:1 rules already reject 0 upstream).
  if (
    serviceId === undefined || cityId === undefined || !streetName ||
    !houseNumber || !propertySize || !doorbellName || !bookingDate ||
    !bookingTime || hours === undefined || cleaners === undefined
  ) {
    throw new AppError("Please provide all required fields for booking!", 400);
  }

  const customerName = user.fullname;
  const customerEmail = user.email;
  const customerPhone = payload.customerPhone || user.phone;

  if (!customerName || !customerEmail) {
    throw new AppError("Your account is missing a name or email — please update your profile.", 400);
  }
  if (!customerPhone) {
    throw new AppError("Please add a phone number to your profile or provide one for this booking!", 400);
  }

  const { service, city } = await resolveServiceAndCity(serviceId, cityId);

  // Reject a bookingTime outside the city working hours. Both values are
  // zero-padded "HH:MM" strings so lexicographic comparison equals numeric.
  if (bookingTime < city.workingHourStarts || bookingTime >= city.workingHourEnds) {
    throw new AppError("Booking time is outside city working hours", 400);
  }

  const resolvedSpecialRequests = await resolveSpecialRequests(specialRequests, service);

  // Server-side price: pricePerHour * hours + sum(add-on prices). Never trusted
  // from the client.
  const totalAmount = service.pricePerHour * hours +
    resolvedSpecialRequests.reduce((sum, sr) => sum + sr.price, 0);

  return {
    user: user._id,
    serviceId,
    cityId,
    serviceName: service.name,
    customerName,
    customerEmail,
    customerPhone,
    streetName,
    houseNumber,
    propertySize,
    doorbellName,
    bookingDate,
    bookingTime,
    hours,
    cleaners,
    totalAmount,
    notes: notes ?? null,
    specialRequests: resolvedSpecialRequests.map((sr) => sr._id),
    supplies: Array.isArray(supplies) ? supplies : []
  };
};

/* ----------------------------------------------------- Email rendering ---- */

// Escape user-provided values before interpolating them into HTML email so a
// name/address/etc. can never inject markup.
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatEuro = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

/**
 * Build the booking-confirmation email (branded, email-client-safe HTML + a
 * plain-text fallback). All interpolated user values pass through escapeHtml.
 * Now also surfaces that payment has been received.
 */
const renderBookingConfirmationEmail = ({
  customerName, serviceName, bookingDate, bookingTime,
  hours, cleaners, streetName, houseNumber, totalAmount
}) => {
  const subject = "CasaClean — Your booking is confirmed 🎉";
  const name = escapeHtml(customerName);
  const total = formatEuro(totalAmount);
  const address =
    [streetName, houseNumber ? `No. ${houseNumber}` : ""].filter(Boolean).join(", ");

  const rows = [
    ["Service", serviceName || "Cleaning service"],
    ["Date", bookingDate],
    ["Time", bookingTime],
    ["Duration", `${hours} h · ${cleaners} cleaner(s)`],
    ["Address", address || "—"],
    ["Payment", `${total} — paid`],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 0;color:#64748b;font-size:14px;">${escapeHtml(label)}</td>
          <td style="padding:12px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:32px 40px;text-align:center;">
                <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">CasaClean</div>
                <div style="color:#99f6e4;font-size:14px;margin-top:4px;">Booking Confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 8px;text-align:center;">
                <div style="width:56px;height:56px;line-height:56px;border-radius:28px;background-color:#ecfdf5;color:#0d9488;font-size:28px;margin:0 auto;">&#10003;</div>
                <h1 style="margin:20px 0 6px;color:#0f172a;font-size:22px;font-weight:700;">Thank you, ${name}!</h1>
                <p style="margin:0;color:#64748b;font-size:15px;">Your reservation has been successfully confirmed and paid.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                  ${detailRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;color:#0f766e;font-size:15px;font-weight:600;">Total paid</td>
                    <td style="padding:16px 20px;color:#0f766e;font-size:20px;font-weight:700;text-align:right;">${escapeHtml(total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 36px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  Need to make a change? Just reply to this email and our team will help.<br />
                  &copy; ${new Date().getFullYear()} CasaClean. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text =
    `Hello ${customerName},\n\n` +
    `Your CasaClean booking is confirmed and paid.\n\n` +
    `Service:  ${serviceName || "Cleaning service"}\n` +
    `Date:     ${bookingDate}\n` +
    `Time:     ${bookingTime}\n` +
    `Duration: ${hours} h (${cleaners} cleaner(s))\n` +
    `Address:  ${address || "—"}\n` +
    `Paid:     ${total}\n\n` +
    `Thank you for choosing CasaClean!`;

  return { subject, html, text };
};

/**
 * Build the cancellation/refund email. Sent (best-effort) when a paid booking is
 * cancelled and its charge is refunded.
 */
const renderRefundEmail = ({ customerName, serviceName, bookingDate, amount }) => {
  const subject = "CasaClean — Your booking was cancelled & refunded";
  const name = escapeHtml(customerName);
  const total = formatEuro(amount);

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:32px 40px;text-align:center;">
                <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">CasaClean</div>
                <div style="color:#99f6e4;font-size:14px;margin-top:4px;">Booking Cancelled</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;text-align:center;">
                <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">Hello ${name},</h1>
                <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">
                  Your booking for <strong>${escapeHtml(serviceName || "Cleaning service")}</strong>
                  on <strong>${escapeHtml(bookingDate)}</strong> has been cancelled.
                  A refund of <strong>${escapeHtml(total)}</strong> has been issued to your
                  original payment method and should appear within a few business days.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 36px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  &copy; ${new Date().getFullYear()} CasaClean. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text =
    `Hello ${customerName},\n\n` +
    `Your CasaClean booking for ${serviceName || "Cleaning service"} on ${bookingDate} has been cancelled.\n` +
    `A refund of ${total} has been issued to your original payment method and should appear within a few business days.\n\n` +
    `— CasaClean`;

  return { subject, html, text };
};

module.exports = {
  resolveServiceAndCity,
  resolveSpecialRequests,
  buildValidatedBookingDraft,
  renderBookingConfirmationEmail,
  renderRefundEmail,
  formatEuro
};
