/*
 * Service ↔ city coverage
 * -----------------------
 * The single client-side statement of "is this service offered in this city?".
 * It mirrors the server's fail-closed check in `resolveServiceAndCity`
 * (server/services/booking.service.js) — the server remains the authority; this
 * exists so the wizard never *offers* a combination checkout would reject.
 *
 * The rule: a service covers a city when it isn't city-restricted
 * (`allCities`), or when the city appears in its explicit `cities` list.
 * Services that don't come from the database carry no coverage data and are
 * treated as available everywhere.
 */

export function coversCity(service, cityId) {
  if (!service) return false;
  if (!service.fromDb || service.allCities) return true;
  return (service.cities || []).includes(String(cityId));
}

/** The subset of `services` bookable in `cityId`. No city yet → nothing is ruled out. */
export function servicesForCity(services = [], cityId) {
  if (!cityId) return services;
  return services.filter((s) => coversCity(s, cityId));
}

export default coversCity;
