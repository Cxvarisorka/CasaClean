/*
 * Service constants
 * -----------------
 * Re-exports the service catalog from the data layer so feature code can import
 * a stable constant path while content lives in one place (data/services.js).
 */
export { SERVICES, getServiceBySlug } from "@/data/services";
