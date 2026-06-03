import { Helmet } from "react-helmet-async";
import { SITE } from "@/constants/metadata";

/**
 * MetaTags — the single source of <head> meta for a page: title, description,
 * canonical, Open Graph and Twitter cards. Pages pass intent; sensible brand
 * defaults fill the rest so no page ships incomplete SEO.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.path] - canonical path (e.g. "/pricing")
 * @param {string} [props.image] - absolute or site-relative OG image
 * @param {"website"|"article"} [props.type="website"]
 * @param {boolean} [props.noIndex=false]
 */
export function MetaTags({
  title,
  description = SITE.description,
  path = "/",
  image = SITE.ogImage,
  type = "website",
  noIndex = false,
}) {
  const fullTitle = title?.includes(SITE.name)
    ? title
    : `${title} · ${SITE.name}`;
  const canonical = `${SITE.url}${path === "/" ? "" : path}`;
  const ogImage = image.startsWith("http") ? image : `${SITE.url}${image}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={SITE.locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

export default MetaTags;
