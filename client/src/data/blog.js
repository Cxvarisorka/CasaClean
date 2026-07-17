/*
 * Blog content
 * ------------
 * A local content store standing in for a CMS. Each post carries everything
 * the list, detail page and SEO/structured-data need. `body` is an array of
 * lightweight blocks rendered by the post page.
 */

export const BLOG_CATEGORIES = ["All", "Home care", "Offices", "Guides", "Product"];

export const BLOG_POSTS = [
  {
    slug: "deep-clean-checklist",
    title: "The Room-by-Room Deep Clean Checklist Professionals Use",
    excerpt:
      "A deep clean is only as good as its checklist. Here's the room-by-room standard our cleaners are trained on — adapted for doing it yourself.",
    category: "Guides",
    author: { name: "Daniele Conti", role: "Head of Quality", avatar: "DC" },
    publishedAt: "2026-05-18",
    readingMinutes: 8,
    cover: "from-brand-500 to-brand-700",
    tags: ["deep clean", "checklist", "guides"],
    featured: true,
    body: [
      { type: "p", text: "Most people clean by memory — and memory always skips the same spots. A written checklist, followed in the same order every time, is the single biggest quality upgrade you can make." },
      { type: "h2", text: "Start high, finish low" },
      { type: "p", text: "Dust falls. Work from light fixtures and shelf tops down to skirting boards and floors, and you'll never clean the same surface twice." },
      { type: "h2", text: "Kitchens and bathrooms earn the deep work" },
      { type: "p", text: "Limescale, grease and grout are where a deep clean pays for itself. Give descaler and degreaser time to work instead of scrubbing harder." },
      { type: "quote", text: "A great clean isn't about effort — it's about order." },
      { type: "h2", text: "The forgotten five" },
      { type: "p", text: "Door handles, light switches, extractor filters, under the bed and behind the sofa. Hit these five and any room instantly feels professionally done." },
    ],
  },
  {
    slug: "how-often-clean-home",
    title: "How Often Should You Really Clean Everything? An Honest Schedule",
    excerpt:
      "Daily, weekly, monthly, seasonally — a realistic cleaning cadence for every part of your home, without the guilt.",
    category: "Home care",
    author: { name: "Nina Petrova", role: "Head of Product", avatar: "NP" },
    publishedAt: "2026-05-04",
    readingMinutes: 5,
    cover: "from-accent-400 to-accent-600",
    tags: ["schedule", "home care", "routine"],
    featured: false,
    body: [
      { type: "p", text: "Cleaning advice tends to swing between 'wipe everything daily' and total chaos. Real homes need a cadence that survives a busy week." },
      { type: "h2", text: "Weekly is the backbone" },
      { type: "p", text: "Bathrooms, kitchen surfaces, floors and bedding on a weekly rhythm keep a home feeling cared for. Everything else can ride on top of that base." },
      { type: "h2", text: "Seasonal deep cleans do the heavy lifting" },
      { type: "p", text: "Ovens, windows, upholstery and grout don't need weekly attention — they need two to four thorough sessions a year. Put them in the calendar and stop thinking about them." },
    ],
  },
  {
    slug: "move-out-deposit-clean",
    title: "Move-Out Cleaning: How to Get Your Full Deposit Back",
    excerpt:
      "Landlords check the same spots every time. Here's the end-of-lease checklist that keeps deposits out of dispute.",
    category: "Guides",
    author: { name: "Marco Bianchi", role: "COO", avatar: "MB" },
    publishedAt: "2026-04-21",
    readingMinutes: 7,
    cover: "from-ink-700 to-ink-900",
    tags: ["move-out", "deposit", "checklist"],
    featured: false,
    body: [
      { type: "p", text: "Cleaning is the most common reason deposits get docked — and the easiest one to prevent. Handover inspections are predictable if you know where landlords look." },
      { type: "h2", text: "Appliances decide the outcome" },
      { type: "p", text: "The inside of the oven and fridge are the first things checked at almost every handover. If they pass, the rest of the inspection tends to go your way." },
      { type: "h2", text: "Document as you go" },
      { type: "p", text: "Photograph each room after cleaning, with a timestamp. If a dispute comes up weeks later, evidence beats memory every time." },
    ],
  },
  {
    slug: "clean-office-productivity",
    title: "What a Clean Office Actually Does for Your Team",
    excerpt:
      "Fewer sick days, better focus, stronger first impressions — the case for treating office cleaning as an investment, not a cost.",
    category: "Offices",
    author: { name: "Lela Gorelishvili", role: "CEO", avatar: "LG" },
    publishedAt: "2026-04-02",
    readingMinutes: 6,
    cover: "from-brand-400 to-brand-600",
    tags: ["office", "workplace", "productivity"],
    featured: false,
    body: [
      { type: "p", text: "Nobody puts 'dusty desks' in an exit interview, but the state of a workspace shapes how people feel about showing up to it every day." },
      { type: "h2", text: "High-touch points drive sick days" },
      { type: "p", text: "Door handles, shared kitchens and meeting-room tables spread more germs than any open-plan debate. Regular sanitation measurably cuts absence." },
      { type: "h2", text: "Schedule around the work, not during it" },
      { type: "p", text: "Evening and early-morning cleans mean your team never trades focus for a vacuum cleaner. It's the difference between cleaning that supports work and cleaning that interrupts it." },
    ],
  },
  {
    slug: "supplies-pros-use",
    title: "The Cleaning Supplies Professionals Actually Use (and Skip)",
    excerpt:
      "You don't need a cupboard full of products. Pros carry a short list — here's what's on it and why.",
    category: "Home care",
    author: { name: "Daniele Conti", role: "Head of Quality", avatar: "DC" },
    publishedAt: "2026-03-15",
    readingMinutes: 4,
    cover: "from-brand-600 to-ink-800",
    tags: ["supplies", "products", "home care"],
    featured: false,
    body: [
      { type: "p", text: "A professional kit is surprisingly small: a good degreaser, a descaler, a neutral all-purpose cleaner, glass cleaner and a stack of quality microfibre cloths cover almost everything a home can throw at you." },
    ],
  },
  {
    slug: "same-cleaner-every-time",
    title: "Why Having the Same Cleaner Every Time Changes Everything",
    excerpt:
      "Consistency isn't a nice-to-have — it's how a good clean becomes a great one. Here's why regular plans keep the same professional on your home.",
    category: "Product",
    author: { name: "Nina Petrova", role: "Head of Product", avatar: "NP" },
    publishedAt: "2026-02-28",
    readingMinutes: 5,
    cover: "from-accent-500 to-accent-700",
    tags: ["regular cleaning", "trust", "product"],
    featured: false,
    body: [
      { type: "p", text: "By the third visit, a regular cleaner knows which sofa cushion the cat claims, which pan never goes in the dishwasher, and exactly how you like the towels. That knowledge compounds — and it's why we match regular plans with the same professional every time." },
    ],
  },
];

export const getPostBySlug = (slug) =>
  BLOG_POSTS.find((post) => post.slug === slug) ?? null;

export const getFeaturedPost = () =>
  BLOG_POSTS.find((post) => post.featured) ?? BLOG_POSTS[0];

export const getRelatedPosts = (slug, limit = 3) =>
  BLOG_POSTS.filter((post) => post.slug !== slug).slice(0, limit);
