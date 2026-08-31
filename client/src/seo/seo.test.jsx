import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect } from "vitest";

import { MetaTags } from "./MetaTags";
import {
  ID,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
  organizationSchema,
  webPageSchema,
  websiteSchema,
} from "./StructuredData";
import { I18nProvider } from "@/i18n";
import { PAGE_META, SITE } from "@/constants/metadata";
import { HOME_FAQS } from "@/data/faq";
import { headFor } from "../../scripts/prerender-seo.mjs";

/*
 * SEO regression suite
 * --------------------
 * These assertions guard the failures that are invisible in the browser: a
 * duplicated canonical, a relative og:image, a share card the static HTML
 * doesn't mention. Nothing here renders wrong on screen when it breaks — the
 * only symptom is a link preview that doesn't expand, or a result page that
 * shows the wrong title, weeks later.
 */

/** Renders meta into the jsdom document head, as Helmet does at runtime. */
async function renderHead(ui) {
  render(
    <HelmetProvider>
      <I18nProvider>{ui}</I18nProvider>
    </HelmetProvider>
  );
  // Helmet writes to the head in an effect; let it flush.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const head = {
  titles: () => [...document.querySelectorAll("head title")].map((t) => t.textContent),
  canonicals: () =>
    [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.getAttribute("href")),
  meta: (selector) => document.querySelector(selector)?.getAttribute("content"),
  all: (selector) => [...document.querySelectorAll(selector)].map((m) => m.getAttribute("content")),
};

/*
 * No manual head cleanup between tests. React 19 hoists these tags itself and
 * removes them when the tree unmounts, which testing-library's automatic
 * cleanup triggers after every test — reaching in to delete them by hand tears
 * nodes out from under React and crashes the next unmount.
 */
describe("MetaTags", () => {
  it("canonicalises the home page with its trailing slash", async () => {
    await renderHead(<MetaTags {...PAGE_META.home} />);

    // One spelling of a URL, everywhere — the sitemap lists this form too.
    expect(head.canonicals()).toEqual([`${SITE.url}/`]);
    expect(head.meta('meta[property="og:url"]')).toBe(`${SITE.url}/`);
  });

  it("ships exactly one title, description and canonical", async () => {
    await renderHead(<MetaTags {...PAGE_META.about} />);

    // The duplication this pins down is not hypothetical: under React 19,
    // react-helmet-async renders each instance's tags rather than merging them,
    // so a second <Seo> higher up the tree adds a title instead of losing to
    // this one — and a crawler reads the first one in the document.
    expect(head.titles()).toHaveLength(1);
    expect(head.canonicals()).toEqual([`${SITE.url}/about`]);
    expect(head.all('meta[name="description"]')).toHaveLength(1);
  });

  it("makes every share image absolute", async () => {
    await renderHead(<MetaTags {...PAGE_META.home} />);

    // A relative og:image is the single most common reason a correct-looking
    // card renders with no picture: crawlers don't resolve it against the page.
    for (const selector of [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
    ]) {
      expect(head.meta(selector)).toBe(`${SITE.url}/og-image.jpg`);
    }
  });

  it("states the card's dimensions and alt text", async () => {
    await renderHead(<MetaTags {...PAGE_META.home} />);

    expect(head.meta('meta[property="og:image:width"]')).toBe("1200");
    expect(head.meta('meta[property="og:image:height"]')).toBe("630");
    expect(head.meta('meta[property="og:image:type"]')).toBe("image/jpeg");
    expect(head.meta('meta[property="og:image:alt"]')).toBeTruthy();
    expect(head.meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  it("declares every published language as an og locale", async () => {
    await renderHead(<MetaTags {...PAGE_META.home} />);

    expect(head.meta('meta[property="og:locale"]')).toBe("en_US");
    expect(head.all('meta[property="og:locale:alternate"]').sort()).toEqual(
      ["el_GR", "it_IT", "ka_GE", "ru_RU"].sort()
    );
  });

  it("opts into large previews on an indexable page", async () => {
    await renderHead(<MetaTags {...PAGE_META.home} />);
    expect(head.meta('meta[name="robots"]')).toContain("max-image-preview:large");
    expect(head.meta('meta[name="robots"]')).toContain("max-snippet:-1");
  });

  it("opts out entirely on a noIndex page", async () => {
    await renderHead(<MetaTags title="Private" path="/profile" noIndex />);
    expect(head.meta('meta[name="robots"]')).toBe("noindex, nofollow");
  });

  it("appends the brand when the title doesn't already carry it", async () => {
    await renderHead(<MetaTags title="Careers" path="/careers" />);
    expect(head.titles()).toEqual([`Careers · ${SITE.name}`]);
  });

  it("leaves a title that already carries the brand alone", async () => {
    await renderHead(<MetaTags {...PAGE_META.about} />);
    expect(head.titles()).toEqual([PAGE_META.about.title]);
  });
});

describe("prerendered head", () => {
  /*
   * The static block in index.html and the runtime block from Helmet describe
   * the same page to the same crawlers. They are produced by two different code
   * paths, so the only thing keeping them honest is this comparison.
   */
  it.each(["home", "about"])("matches what MetaTags renders for %s", async (key) => {
    const page = PAGE_META[key];
    await renderHead(<MetaTags {...page} />);

    const staticHead = headFor(page);
    const expected = {
      title: head.titles()[0],
      description: head.meta('meta[name="description"]'),
      canonical: head.canonicals()[0],
      ogTitle: head.meta('meta[property="og:title"]'),
      ogUrl: head.meta('meta[property="og:url"]'),
      ogImage: head.meta('meta[property="og:image"]'),
      robots: head.meta('meta[name="robots"]'),
    };

    for (const value of Object.values(expected)) {
      expect(value).toBeTruthy();
      // Compared against the escaped form, since the static head is raw HTML.
      expect(staticHead).toContain(value.replace(/&/g, "&amp;"));
    }

    // Attribute-exact, not just contained: `https://casaclean.com` is a
    // substring of `https://casaclean.com/`, so a trailing-slash mismatch
    // between the two heads would slip past the loop above unnoticed.
    expect(staticHead).toContain(`href="${expected.canonical}"`);
    expect(staticHead).toContain(`content="${expected.ogUrl}"`);
  });
});

describe("structured data", () => {
  it("links the page, site and organization into one graph", () => {
    const page = webPageSchema(PAGE_META.about);

    expect(page["@id"]).toBe(ID.page("/about"));
    expect(page.isPartOf["@id"]).toBe(ID.website);
    expect(page.about["@id"]).toBe(ID.organization);
    expect(websiteSchema().publisher["@id"]).toBe(ID.organization);
    expect(localBusinessSchema().parentOrganization["@id"]).toBe(ID.organization);
    expect(organizationSchema()["@id"]).toBe(ID.organization);
  });

  it("marks the about page as an AboutPage pointing at its breadcrumb", () => {
    const trail = [
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ];
    const page = webPageSchema({
      ...PAGE_META.about,
      type: "AboutPage",
      breadcrumb: trail,
    });

    expect(page["@type"]).toBe("AboutPage");
    expect(page.breadcrumb["@id"]).toBe(breadcrumbSchema(trail, "/about")["@id"]);
    expect(breadcrumbSchema(trail, "/about").itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
      { "@type": "ListItem", position: 2, name: "About", item: `${SITE.url}/about` },
    ]);
  });

  it("never claims a rating that isn't backed by published reviews", () => {
    // Google's review-snippet policy treats an aggregateRating a visitor can't
    // find on the page as fabricated, and the penalty reaches every rich result
    // on the domain. Stars have to be earned by the review endpoint, not typed.
    expect(localBusinessSchema()).not.toHaveProperty("aggregateRating");
    expect(localBusinessSchema({ rating: { value: 4.8, count: 0 } })).not.toHaveProperty(
      "aggregateRating"
    );
    expect(localBusinessSchema({ rating: { value: 4.8, count: 12 } }).aggregateRating).toMatchObject(
      { ratingValue: 4.8, reviewCount: 12 }
    );
  });

  it("describes where the business operates and what it sells", () => {
    const business = localBusinessSchema();

    expect(business.areaServed.map((a) => a.name)).toContain("Rome");
    expect(business.geo).toMatchObject({ "@type": "GeoCoordinates" });
    expect(business.openingHoursSpecification[0].opens).toBe(SITE.hours.opens);
    expect(business.hasOfferCatalog.itemListElement.length).toBeGreaterThan(0);
    // Every offer must price something, or the catalogue is decorative markup.
    for (const offer of business.hasOfferCatalog.itemListElement) {
      expect(offer.priceSpecification.priceCurrency).toBe("EUR");
      expect(offer.itemOffered.url).toMatch(/^https?:\/\/.+\/services\/.+/);
    }
  });

  it("marks up exactly the FAQs the home page shows", () => {
    // FAQ markup has to match the visible content — HOME_FAQS is the shared
    // subset FaqPreviewSection renders, which is what makes that true.
    const schema = faqSchema(HOME_FAQS);

    expect(schema.mainEntity).toHaveLength(HOME_FAQS.length);
    expect(schema.mainEntity[0].name).toBe(HOME_FAQS[0].question);
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(HOME_FAQS[0].answer);
  });
});
