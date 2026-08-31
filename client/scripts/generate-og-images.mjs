/*
 * generate-og-images.mjs
 * ----------------------
 * Renders the social share cards in `public/` (og-image.jpg, og-image-about.jpg).
 *
 * These are the only images most people ever see of this site: a link pasted
 * into WhatsApp, Slack, Facebook or LinkedIn is rendered from `og:image`, and a
 * missing file there is not a degraded card but *no* card — the link collapses
 * to a bare URL. They are generated rather than hand-exported so the wording on
 * the card can't drift from `SITE`/`PAGE_META`, which is where the same claims
 * are made to search engines.
 *
 * The renderer is the Chromium already on the machine (Edge counts), driven in
 * headless screenshot mode — text is laid out by a real browser, so the card
 * uses the site's own font and palette without adding an image dependency to
 * the project. Regenerate after changing brand copy, colours or the logo:
 *
 *   npm run og
 *
 * The rendered cards are committed: a deploy must never depend on a browser
 * being installed on the build host.
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");

/* --- The renderer --------------------------------------------------------
 * Whatever Chromium is already installed. Nothing here is Edge-specific; it is
 * simply the one that ships with Windows, so `npm run og` works on a fresh
 * clone without a 300 MB browser download.
 */
const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findBrowser() {
  const found = BROWSER_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    console.error(
      "No Chromium/Edge/Chrome found. Set CHROME_PATH to a browser executable."
    );
    process.exit(1);
  }
  return found;
}

/* --- Embedded assets -----------------------------------------------------
 * Both the font and the logo are inlined as data URIs. A headless page loaded
 * from file:// is its own opaque origin, so a relative @font-face or <img src>
 * is a cross-origin request the browser refuses; inlining sidesteps the whole
 * question and keeps the card a single self-contained file.
 */
const asDataUri = (path, mime) =>
  `data:${mime};base64,${readFileSync(path).toString("base64")}`;

const FONT_URI = asDataUri(
  join(
    ROOT,
    "node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2"
  ),
  "font/woff2"
);
const LOGO_URI = asDataUri(join(ROOT, "src/assets/logo-144.webp"), "image/webp");

/* --- Brand tokens --------------------------------------------------------
 * Mirrors `--color-brand-*` in src/styles/globals.css. Duplicated rather than
 * parsed out of the stylesheet because a card is a fixed composition: these
 * three stops are a design decision about *this* image, not a live theme.
 */
const BRAND = {
  deep: "#042b29",
  mid: "#0f6f68",
  bright: "#1dae9f",
  glow: "#3fcabc",
  sand: "#f7f5f0",
};

/**
 * The card markup. One layout, two sets of words — every card in the set reads
 * as the same brand rather than as two separate designs.
 *
 * @param {{eyebrow: string, title: string, subtitle: string, chips: string[]}} card
 */
function cardHtml({ eyebrow, title, subtitle, chips }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Jakarta";
    src: url("${FONT_URI}") format("woff2-variations");
    font-weight: 200 800;
    font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    font-family: "Jakarta", system-ui, sans-serif;
    background: ${BRAND.deep};
    color: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    position: relative;
    width: 1200px;
    height: 630px;
    overflow: hidden;
    padding: 72px 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
      radial-gradient(1100px 620px at 88% -12%, ${BRAND.glow}59 0%, transparent 62%),
      radial-gradient(760px 540px at -8% 108%, ${BRAND.bright}45 0%, transparent 60%),
      linear-gradient(135deg, ${BRAND.deep} 0%, ${BRAND.mid} 55%, ${BRAND.deep} 100%);
  }
  /* A faint grid, the same motif the site's hero uses behind the headline. */
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(#ffffff0d 1px, transparent 1px),
      linear-gradient(90deg, #ffffff0d 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(900px 520px at 50% 40%, #000 0%, transparent 78%);
  }
  .row { position: relative; display: flex; align-items: center; gap: 20px; }
  .mark {
    width: 76px; height: 76px; border-radius: 999px; object-fit: cover;
    box-shadow: 0 10px 30px #0006, 0 0 0 3px #ffffff26;
  }
  .wordmark { font-size: 42px; font-weight: 800; letter-spacing: -0.02em; }
  .body { position: relative; }
  .eyebrow {
    font-size: 21px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase; color: ${BRAND.glow};
  }
  h1 {
    margin-top: 20px;
    font-size: 68px; line-height: 1.06; font-weight: 800; letter-spacing: -0.03em;
    max-width: 20ch; text-wrap: balance;
  }
  .subtitle {
    margin-top: 24px;
    font-size: 27px; line-height: 1.45; font-weight: 400; color: #ffffffd9;
    max-width: 34ch;
  }
  .foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .chips { display: flex; gap: 12px; flex-wrap: wrap; }
  .chip {
    font-size: 20px; font-weight: 600; color: #fff;
    padding: 11px 20px; border-radius: 999px;
    background: #ffffff1c; border: 1px solid #ffffff2e;
    white-space: nowrap;
  }
  .url { font-size: 22px; font-weight: 700; color: ${BRAND.glow}; white-space: nowrap; }
</style>
</head>
<body>
  <div class="card">
    <div class="grid"></div>

    <div class="row">
      <img class="mark" src="${LOGO_URI}" alt="" />
      <span class="wordmark">CasaClean</span>
    </div>

    <div class="body">
      <p class="eyebrow">${eyebrow}</p>
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
    </div>

    <div class="foot">
      <div class="chips">${chips.map((c) => `<span class="chip">${c}</span>`).join("")}</div>
      <span class="url">casaclean.com</span>
    </div>
  </div>
</body>
</html>`;
}

/*
 * The set. `file` is what `PAGE_META.<page>.image` points at, so adding a card
 * is an entry here plus the `image` on that page's meta.
 */
const CARDS = [
  {
    file: "og-image.jpg",
    eyebrow: "Professional cleaning · Italy",
    title: "A spotless home, without lifting a finger",
    subtitle:
      "Vetted, insured cleaners for homes, holiday rentals and offices — booked online in about a minute.",
    chips: ["Vetted & insured", "Transparent prices", "12 Italian cities"],
  },
  {
    file: "og-image-about.jpg",
    eyebrow: "About us",
    title: "Professional cleaning services in Italy",
    subtitle:
      "A brand of Vacanze Romane S.r.l.s. — qualified staff, transparent pricing and support you can count on.",
    chips: ["Since 2021", "Registered in Rome", "5 languages"],
  },
];

const fileUrl = (path) => `file://${path.replace(/\\/g, "/")}`;

const run = (browser, args, opts = {}) =>
  execFileSync(browser, ["--headless=new", "--disable-gpu", ...args], {
    timeout: 60_000,
    ...opts,
  });

/*
 * Chromium only screenshots to PNG, and a full-bleed gradient is close to the
 * worst case for PNG's filters — the card lands around half a megabyte. That
 * matters: several chat clients (WhatsApp and Telegram among them) give up on
 * the preview thumbnail well before then and show a bare link instead.
 *
 * So the PNG gets a second pass through the same browser: a throwaway page
 * paints it onto a canvas and hands back `toDataURL("image/jpeg")`, which is
 * read off stdout via --dump-dom. Photographic re-encoding of a gradient costs
 * nothing visible and roughly a fifth of the bytes, with no image library and
 * no second tool to install.
 */
function toJpeg(browser, pngPath, quality = 0.92) {
  const page = `<!doctype html><meta charset="utf-8"><img id="src" src="${asDataUri(
    pngPath,
    "image/png"
  )}"><pre id="out"></pre><script>
    const img = document.getElementById("src");
    const emit = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      // JPEG has no alpha; paint the brand ground first so any transparent
      // pixel composites to the card's colour rather than to black.
      ctx.fillStyle = "${BRAND.deep}";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      document.getElementById("out").textContent = c.toDataURL("image/jpeg", ${quality});
    };
    if (img.complete) emit(); else img.onload = emit;
  </script>`;

  const workdir = mkdtempSync(join(tmpdir(), "casaclean-jpg-"));
  const pagePath = join(workdir, "encode.html");
  writeFileSync(pagePath, page, "utf8");

  try {
    const dom = run(
      browser,
      ["--virtual-time-budget=10000", "--dump-dom", fileUrl(pagePath)],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }
    );
    const base64 = /data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/.exec(dom)?.[1];
    if (!base64) throw new Error("canvas returned no JPEG data");
    return Buffer.from(base64, "base64");
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

function render(browser, card) {
  const workdir = mkdtempSync(join(tmpdir(), "casaclean-og-"));
  const htmlPath = join(workdir, "card.html");
  // Chromium writes the screenshot relative to its own cwd unless the path is
  // absolute; keep it inside the temp dir and copy the finished file into place
  // so a failed render never leaves a half-written image in `public/`.
  const shotPath = join(workdir, "card.png");

  writeFileSync(htmlPath, cardHtml(card), "utf8");

  try {
    run(
      browser,
      [
        "--hide-scrollbars",
        "--force-color-profile=srgb",
        "--window-size=1200,630",
        `--screenshot=${shotPath}`,
        fileUrl(htmlPath),
      ],
      { stdio: "ignore" }
    );

    if (!existsSync(shotPath)) throw new Error("browser produced no screenshot");

    const out = join(PUBLIC_DIR, card.file);
    if (card.file.endsWith(".png")) {
      copyFileSync(shotPath, out);
    } else {
      writeFileSync(out, toJpeg(browser, shotPath));
    }
    console.log(`  ✓ public/${card.file}  (${(statSync(out).size / 1024).toFixed(0)} KB)`);
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

const browser = findBrowser();
console.log(`Rendering social cards with ${browser}`);
for (const card of CARDS) render(browser, card);
console.log("Done.");
