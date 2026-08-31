import { Helmet } from "react-helmet-async";
import { SITE } from "@/constants/metadata";
import { useTranslation } from "@/i18n";
import { LANGUAGES } from "@/i18n/config";

/**
 * MetaTags — the single source of <head> meta for a page: title, description,
 * canonical, robots directives, Open Graph and Twitter cards. Pages pass intent;
 * sensible brand defaults fill the rest so no page ships incomplete SEO.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.path] - canonical path (e.g. "/services")
 * @param {string} [props.image] - absolute or site-relative share image
 * @param {string} [props.imageAlt] - what the share image depicts
 * @param {string[]} [props.keywords]
 * @param {"website"|"article"} [props.type="website"]
 * @param {boolean} [props.noIndex=false]
 */
export function MetaTags({
  title,
  description = SITE.description,
  path = "/",
  image = SITE.ogImage,
  imageAlt = SITE.ogImageAlt,
  keywords,
  type = "website",
  noIndex = false,
}) {
  const { locale } = useTranslation();

  const fullTitle = title?.includes(SITE.name)
    ? title
    : `${title} · ${SITE.name}`;
  /*
   * Every path already starts with "/", so the home page canonicalises to
   * `https://casaclean.com/` — with the trailing slash. That form is what the
   * sitemap lists and what Google displays for a root URL, and picking one form
   * and holding it everywhere is the whole job: two spellings of the same page
   * is the textbook way to split its signals between two "different" URLs.
   */
  const canonical = `${SITE.url}${path}`;

  /*
   * Share images must be absolute. A crawler resolves `og:image` without the
   * page's base URL — a site-relative path is simply dropped, which is the most
   * common reason a correct-looking card renders with no picture.
   */
  const ogImage = image.startsWith("http") ? image : `${SITE.url}${image}`;
  // The dimensions only describe the brand card; a page passing its own image
  // (a service photo, say) would be misdescribed by them, so they travel only
  // with the file they were measured from.
  const isBrandCard = !image.startsWith("http");

  /*
   * `og:locale` states the language the page is *currently* rendered in, which
   * here is a client-side choice rather than a different URL. The alternates
   * are therefore honest: this same address really does serve those languages.
   *
   * There is deliberately no `hreflang` set to go with them. hreflang points at
   * a distinct URL per language, and inventing `?lang=it` links that resolve to
   * the same document would tell search engines about pages that don't exist.
   * If per-locale routes are ever added, that is where hreflang belongs.
   */
  const ogLocale = SITE.ogLocales[locale] || SITE.ogLocales.en;
  const alternateLocales = LANGUAGES.map((l) => SITE.ogLocales[l.code]).filter(
    (l) => l && l !== ogLocale
  );

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/*
       * Without `max-image-preview:large` Google shows a thumbnail-sized image
       * beside the result; with it, a visual page can win the large preview and
       * the Discover feed. `max-snippet:-1` lifts the cap on how much of the
       * description can be shown. Both are opt-in — the default is the smaller
       * treatment — which is why they are stated even though "index, follow" is
       * already the implicit default.
       */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
      )}

      {keywords?.length ? (
        <meta name="keywords" content={keywords.join(", ")} />
      ) : null}

      {/* Open Graph — Facebook, LinkedIn, WhatsApp, Slack, Telegram, iMessage */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={imageAlt} />
      {isBrandCard && (
        <meta property="og:image:type" content={SITE.ogImageType} />
      )}
      {isBrandCard && (
        <meta property="og:image:width" content={String(SITE.ogImageWidth)} />
      )}
      {isBrandCard && (
        <meta property="og:image:height" content={String(SITE.ogImageHeight)} />
      )}
      {/* `og:image:secure_url` is what older Facebook clients read over HTTPS. */}
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((alt) => (
        <meta key={alt} property="og:locale:alternate" content={alt} />
      ))}

      {/* Twitter/X */}
      {/* No `twitter:site` — the brand has no X account to attribute the card to. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />
    </Helmet>
  );
}

export default MetaTags;
