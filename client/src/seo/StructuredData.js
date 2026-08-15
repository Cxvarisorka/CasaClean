/*
 * Structured data builders
 * ------------------------
 * Pure functions that produce schema.org JSON-LD objects. Kept framework-free
 * so they're trivially testable; the <SchemaMarkup> component serializes them.
 */

import { SITE } from "@/constants/metadata";

const SOCIAL_PROFILES = Object.values(SITE.social || {}).filter(Boolean);

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: `${SITE.url}/logo.png`,
    email: SITE.email,
    telephone: SITE.phone,
    foundingDate: SITE.founded,
    // `sameAs` is an identity claim, so it lists only the profiles the business
    // actually owns (`SITE.social`) and is omitted entirely when there are none.
    ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
  };
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: SITE.name,
    image: `${SITE.url}${SITE.ogImage}`,
    url: SITE.url,
    telephone: SITE.phone,
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.97",
      reviewCount: "1280",
    },
  };
}

// No `potentialAction`/SearchAction: the site has no search endpoint to point
// one at, and advertising a URL that doesn't handle `?q=` is invalid markup.
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
  };
}

export function breadcrumbSchema(items = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
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
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
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
