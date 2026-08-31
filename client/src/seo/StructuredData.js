/*
 * Structured data builders
 * ------------------------
 * Pure functions that produce schema.org JSON-LD objects. Kept framework-free
 * so they're trivially testable; the <SchemaMarkup> component serializes them.
 *
 * Every node carries a stable `@id` and refers to the others by that id rather
 * than repeating them. That is what turns a handful of separate blocks into one
 * graph: search engines merge nodes sharing an `@id` across every page they
 * crawl, so the organization described on the About page and the one publishing
 * the home page are understood as the same entity instead of two businesses
 * with similar names. The ids are URL fragments by convention — they name a
 * thing, they are not addresses anyone fetches.
 */

import { SITE } from "@/constants/metadata";
import { CITIES } from "@/data/cities";
import { SERVICES } from "@/data/services";
import { LANGUAGES } from "@/i18n/config";

const SOCIAL_PROFILES = Object.values(SITE.social || {}).filter(Boolean);

/** Canonical node ids. Stable across pages — that is the whole point of them. */
export const ID = {
  organization: `${SITE.url}/#organization`,
  website: `${SITE.url}/#website`,
  localBusiness: `${SITE.url}/#business`,
  page: (path) => `${SITE.url}${path}#webpage`,
};

// Matches the canonical form in MetaTags: the root keeps its trailing slash.
const absolute = (path) => `${SITE.url}${path}`;

const postalAddress = () => ({
  "@type": "PostalAddress",
  streetAddress: SITE.address.street,
  addressLocality: SITE.address.city,
  addressRegion: SITE.address.region,
  postalCode: SITE.address.postalCode,
  addressCountry: SITE.address.country,
});

/** The cities we actually operate in, as places a search engine can resolve. */
const areaServed = () =>
  CITIES.filter((c) => c.enabled).map((c) => ({
    "@type": "City",
    name: c.name,
    containedInPlace: { "@type": "Country", name: "Italy" },
  }));

/** The languages a customer can be served in — the site ships all five. */
const knowsLanguage = () => LANGUAGES.map((l) => l.code);

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID.organization,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: {
      // Stated as an ImageObject rather than a bare URL: Google's logo
      // guidelines want the dimensions, and a logo it can't size is a logo it
      // quietly ignores in the knowledge panel.
      "@type": "ImageObject",
      "@id": `${SITE.url}/#logo`,
      url: `${SITE.url}/apple-touch-icon.png`,
      width: 512,
      height: 512,
      caption: SITE.name,
    },
    image: { "@id": `${SITE.url}/#logo` },
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    foundingDate: SITE.founded,
    knowsLanguage: knowsLanguage(),
    areaServed: areaServed(),
    // `sameAs` is an identity claim, so it lists only the profiles the business
    // actually owns (`SITE.social`) and is omitted entirely when there are none.
    ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
    address: postalAddress(),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: SITE.phone,
      email: SITE.email,
      areaServed: "IT",
      availableLanguage: knowsLanguage(),
    },
  };
}

/**
 * The service catalogue, as an offer list hanging off the business. This is
 * what lets a result carry "Regular cleaning · Deep cleaning · Office cleaning"
 * under the listing instead of only a name and a phone number.
 */
const offerCatalog = () => ({
  "@type": "OfferCatalog",
  name: `${SITE.name} cleaning services`,
  itemListElement: SERVICES.map((service) => ({
    "@type": "Offer",
    itemOffered: {
      "@type": "Service",
      name: service.name,
      description: service.description,
      url: `${SITE.url}/services/${service.slug}`,
      serviceType: service.name,
      provider: { "@id": ID.organization },
    },
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: service.pricePerHour,
      priceCurrency: "EUR",
      unitCode: "HUR",
    },
  })),
});

/**
 * The physical, local-search face of the business.
 *
 * @param {object} [options]
 * @param {{value: number|string, count: number}} [options.rating] - aggregate over
 *   reviews that are actually published on the site. Omitted unless supplied:
 *   an `aggregateRating` a visitor can't find on the page is exactly what
 *   Google's review-snippet policy treats as fabricated, and the penalty for
 *   getting caught is losing rich results site-wide — far more than the stars
 *   were worth.
 */
export function localBusinessSchema({ rating } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": ID.localBusiness,
    name: SITE.name,
    legalName: SITE.legalName,
    description: SITE.description,
    image: `${SITE.url}${SITE.ogImage}`,
    logo: `${SITE.url}/apple-touch-icon.png`,
    url: SITE.url,
    telephone: SITE.phone,
    email: SITE.email,
    priceRange: "€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Credit Card, Debit Card",
    address: postalAddress(),
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    areaServed: areaServed(),
    knowsLanguage: knowsLanguage(),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SITE.hours.days,
        opens: SITE.hours.opens,
        closes: SITE.hours.closes,
      },
    ],
    hasOfferCatalog: offerCatalog(),
    parentOrganization: { "@id": ID.organization },
    ...(rating?.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.value,
        reviewCount: rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

// No `potentialAction`/SearchAction: the site has no search endpoint to point
// one at, and advertising a URL that doesn't handle `?q=` is invalid markup.
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ID.website,
    name: SITE.name,
    alternateName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    publisher: { "@id": ID.organization },
    inLanguage: knowsLanguage(),
  };
}

/**
 * The page itself, tying a URL to the entity that publishes it and to the
 * breadcrumb trail leading to it. `@type` varies by role — `AboutPage` tells a
 * search engine the document *is* the company description, which is how an
 * about page becomes a knowledge-panel source rather than one more page.
 *
 * @param {object} page
 * @param {string} page.path @param {string} page.title @param {string} page.description
 * @param {string} [page.type="WebPage"] @param {string} [page.image]
 * @param {object[]} [page.breadcrumb] - `[{ name, path }]`, innermost last
 */
export function webPageSchema({
  path,
  title,
  description,
  type = "WebPage",
  image = SITE.ogImage,
  breadcrumb,
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": ID.page(path),
    url: absolute(path),
    name: title,
    description,
    isPartOf: { "@id": ID.website },
    about: { "@id": ID.organization },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: image.startsWith("http") ? image : `${SITE.url}${image}`,
    },
    inLanguage: "en",
    ...(breadcrumb?.length && {
      breadcrumb: { "@id": `${absolute(path)}#breadcrumb` },
    }),
  };
}

export function breadcrumbSchema(items = [], path) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    // Anchored to the page that owns it when a path is given, so `webPageSchema`
    // can point `breadcrumb` at this exact node instead of restating the trail.
    ...(path ? { "@id": `${absolute(path)}#breadcrumb` } : {}),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function faqSchema(faqs = []) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * `rating` is the aggregate over the service's PUBLISHED reviews. It's only
 * emitted when there is at least one — search engines (rightly) treat an
 * aggregateRating with no reviews behind it as invalid markup.
 */
export function serviceSchema(service, rating = null) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    description: service.description,
    provider: { "@id": ID.organization },
    areaServed: "IT",
    offers: {
      "@type": "Offer",
      price: service.startingAt,
      priceCurrency: "EUR",
    },
    ...(rating?.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.value,
        reviewCount: rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}
