/*
 * prerender-seo.mjs
 * -----------------
 * Post-build step. Gives every marketing route its own static <head>.
 *
 * The problem it solves: this is a client-rendered SPA behind a catch-all
 * rewrite, so every URL is served the same `index.html`. React and Helmet then
 * fill the head in — which is fine for Google (it renders JavaScript) and
 * useless for everyone else. Facebook, LinkedIn, WhatsApp, Slack, Telegram,
 * iMessage, Discord and X all build their link preview from the HTML exactly as
 * delivered. Paste a link to /about into any of them and, without this step,
 * they read the home page's title and description — or, before there was a
 * share image on disk at all, showed a bare blue link.
 *
 * The fix is not to render the app, only its head: for each route this writes
 * `dist/<route>/index.html`, a byte-identical copy of the built page with the
 * block between the `seo:start` / `seo:end` markers swapped for that route's
 * tags. Static files are matched before rewrites on Vercel (and on Netlify, and
 * by nginx's `try_files`), so /about is served the prerendered copy while
 * everything unrecognised still falls through to the SPA. The app boots
 * identically either way and Helmet takes over on mount.
 *
 * One trap in that rewrite (client/vercel.json): `cleanUrls: true` strips the
 * `.html` extension at build time, so a rewrite destination of `/index.html`
 * no longer resolves and every non-prerendered URL — /admin, /booking, /signin,
 * a refreshed /services/:slug — becomes a hard Vercel 404. The destination
 * must be `/index` (no extension) for as long as cleanUrls is on.
 *
 * Runs from `npm run build`; `node scripts/prerender-seo.mjs` re-runs it against
 * an existing `dist/`.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_META, SITE } from "../src/constants/metadata.js";
import { LANGUAGES } from "../src/i18n/config.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const START = "<!-- seo:start -->";
const END = "<!-- seo:end -->";

/*
 * Which routes get their own document. Only pages worth landing on from a
 * search result or a shared link: the booking wizard and the account area are
 * behind a sign-in and `robots.txt` already keeps crawlers out of them, so a
 * prerendered head for those would be a file nobody ever requests.
 */
const ROUTES = ["home", "services", "about", "contact", "faq", "careers", "privacy", "terms"];

/** HTML-escape a text value destined for an attribute. */
const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const meta = (kind, key, content) =>
  `    <meta ${kind}="${key}" content="${esc(content)}" />`;

/**
 * The head block for one route. Mirrors src/seo/MetaTags.jsx tag for tag —
 * they describe the same page to the same crawlers, and the moment they
 * disagree one of them is lying. A test pins them together.
 */
function headFor(page) {
  const title = page.title.includes(SITE.name)
    ? page.title
    : `${page.title} · ${SITE.name}`;
  // Same form as src/seo/MetaTags.jsx — the root keeps its trailing slash.
  const canonical = `${SITE.url}${page.path}`;
  const image = `${SITE.url}${page.image || SITE.ogImage}`;
  const imageAlt = page.imageAlt || SITE.ogImageAlt;
  const ogLocale = SITE.ogLocales.en;
  const alternates = LANGUAGES.map((l) => SITE.ogLocales[l.code]).filter(
    (l) => l && l !== ogLocale
  );

  return [
    `    <title>${esc(title)}</title>`,
    meta("name", "description", page.description),
    `    <link rel="canonical" href="${esc(canonical)}" />`,
    meta(
      "name",
      "robots",
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    ),
    ...(page.keywords?.length
      ? [meta("name", "keywords", page.keywords.join(", "))]
      : []),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE.name),
    meta("property", "og:title", title),
    meta("property", "og:description", page.description),
    meta("property", "og:url", canonical),
    meta("property", "og:image", image),
    meta("property", "og:image:secure_url", image),
    meta("property", "og:image:type", SITE.ogImageType),
    meta("property", "og:image:width", SITE.ogImageWidth),
    meta("property", "og:image:height", SITE.ogImageHeight),
    meta("property", "og:image:alt", imageAlt),
    meta("property", "og:locale", ogLocale),
    ...alternates.map((alt) => meta("property", "og:locale:alternate", alt)),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", page.description),
    meta("name", "twitter:image", image),
    meta("name", "twitter:image:alt", imageAlt),
  ].join("\n");
}

/** Swap the marked block in `html` for this route's tags. */
export function applyHead(html, page) {
  const from = html.indexOf(START);
  const to = html.indexOf(END);
  if (from === -1 || to === -1) {
    throw new Error(
      "index.html is missing the seo:start/seo:end markers — prerendering cannot place the tags."
    );
  }
  return (
    html.slice(0, from + START.length) +
    "\n" +
    headFor(page) +
    "\n    " +
    html.slice(to)
  );
}

/*
 * robots.txt and sitemap.xml, rebuilt from the same `SITE.url` every canonical
 * and share image is built from.
 *
 * They used to be hand-written files in `public/` with the origin typed into
 * them, which is exactly how a deploy ends up advertising a domain it isn't
 * served from: the site went live on casaclean.it while every absolute URL in
 * its head — and in these two files — still said casaclean.com, so the share
 * cards resolved to a host that answered nothing. Generating them here means a
 * wrong origin is now one wrong environment variable, not four places to
 * remember, and `VITE_SITE_URL` fixes all of them at once.
 *
 * The copies in `public/` stay as the dev-server fallback (Vite serves those
 * directly and never runs this script); these overwrite them in `dist/`.
 */
function writeRobots() {
  const disallow = [
    "/booking",
    "/profile",
    "/admin",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ];
  const cards = [
    ...new Set(
      ROUTES.map((key) => PAGE_META[key]?.image).filter(Boolean).concat(SITE.ogImage)
    ),
  ];

  const body = `# ${SITE.name} — ${SITE.url}
#
# Generated by scripts/prerender-seo.mjs at build time — edit the source in
# public/robots.txt, not this copy.
#
# What is blocked below is blocked because it is either behind a sign-in or
# personal to one visitor: crawling it produces a soft-404 or a sign-in page
# under a URL that promises otherwise.

User-agent: *
Allow: /

${disallow.map((path) => `Disallow: ${path}`).join("\n")}

# The share cards must stay crawlable — a blocked og:image is a link preview
# with a blank frame, and several networks refuse to render the card at all.
${cards.map((path) => `Allow: ${path}`).join("\n")}

Sitemap: ${SITE.url}/sitemap.xml
`;

  writeFileSync(join(DIST, "robots.txt"), body, "utf8");
  console.log("  ✓ robots.txt");
}

/** Per-route crawl hints. Only `lastmod` is acted on, so it is kept honest. */
const SITEMAP_HINTS = {
  home: { changefreq: "weekly", priority: "1.0" },
  services: { changefreq: "monthly", priority: "0.9" },
  about: { changefreq: "monthly", priority: "0.8" },
  faq: { changefreq: "monthly", priority: "0.6" },
  contact: { changefreq: "yearly", priority: "0.5" },
  careers: { changefreq: "monthly", priority: "0.5" },
  privacy: { changefreq: "yearly", priority: "0.3" },
  terms: { changefreq: "yearly", priority: "0.3" },
};

function writeSitemap() {
  const lastmod = new Date().toISOString().slice(0, 10);

  const entries = ROUTES.filter((key) => PAGE_META[key]).map((key) => {
    const { changefreq, priority } = SITEMAP_HINTS[key] || {
      changefreq: "monthly",
      priority: "0.5",
    };
    return [
      "  <url>",
      `    <loc>${SITE.url}${PAGE_META[key].path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/prerender-seo.mjs — the same routes that get a
     prerendered head, at the same origin as every canonical on the site. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  writeFileSync(join(DIST, "sitemap.xml"), body, "utf8");
  console.log("  ✓ sitemap.xml");
}

function main() {
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    console.error("dist/index.html not found — run `npm run build` first.");
    process.exit(1);
  }

  const built = readFileSync(indexPath, "utf8");

  /*
   * The failure this catches has already happened once: the site went live on
   * casaclean.it with `VITE_SITE_URL` unset, so every canonical, og:url and
   * og:image resolved to the default casaclean.com — a domain that answered
   * nothing. Messenger read og:url, tried to scrape that host, and rendered no
   * card at all. Nothing was broken on screen and no build step failed, so the
   * only symptom was link previews quietly not working.
   *
   * A warning rather than an error: a preview build or a fresh clone has no
   * reason to set it, and failing the build there would be worse than the bug.
   */
  if (!globalThis.process?.env?.VITE_SITE_URL) {
    console.warn(
      `  ! VITE_SITE_URL is not set — using the default ${SITE.url}.\n` +
        "    Every canonical, og:url and og:image will name that origin. If the\n" +
        "    site is served from anywhere else, link previews will not render."
    );
  }

  for (const key of ROUTES) {
    const page = PAGE_META[key];
    if (!page) {
      console.warn(`  ! no PAGE_META.${key} — skipped`);
      continue;
    }

    const html = applyHead(built, page);
    // The home page IS dist/index.html; every other route becomes a directory
    // index, which is the shape static hosts resolve a clean URL to.
    const out =
      page.path === "/" ? indexPath : join(DIST, page.path, "index.html");

    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html, "utf8");
    console.log(`  ✓ ${page.path}`);
  }

  writeRobots();
  writeSitemap();
}

// Importable for tests; only writes files when run as a script.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Prerendering SEO heads");
  main();
  console.log("Done.");
}

export { headFor, ROUTES };
