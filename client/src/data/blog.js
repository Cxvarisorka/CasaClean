/*
 * Blog content
 * ------------
 * A local content store standing in for a CMS. Each post carries everything
 * the list, detail page and SEO/structured-data need. `body` is an array of
 * lightweight blocks rendered by the post page.
 */

export const BLOG_CATEGORIES = ["All", "Operations", "Hosting", "Guides", "Product"];

export const BLOG_POSTS = [
  {
    slug: "back-to-back-turnovers",
    title: "How to Nail Back-to-Back Turnovers Without Burning Out",
    excerpt:
      "Same-day checkouts and check-ins are the highest-stakes moment in hosting. Here's the operating system top hosts use to make them routine.",
    category: "Operations",
    author: { name: "Marco Bianchi", role: "COO", avatar: "MB" },
    publishedAt: "2026-05-18",
    readingMinutes: 6,
    cover: "from-brand-500 to-brand-700",
    tags: ["turnovers", "scheduling", "operations"],
    featured: true,
    body: [
      { type: "p", text: "The gap between a guest checking out at 11am and the next checking in at 3pm is where great hosting is won or lost. Four hours sounds like plenty until laundry, a deep bathroom, and a missing coffee pod collide." },
      { type: "h2", text: "Standardize before you optimize" },
      { type: "p", text: "You can't speed up a process you haven't written down. Start with a fixed checklist for every room, in the same order, every time. Consistency is what makes a turnover predictable — and predictability is what lets you schedule around it." },
      { type: "h2", text: "Pre-stage everything you can" },
      { type: "p", text: "Fresh linens, restock kits and amenities staged in advance turn a chaotic scramble into an assembly line. The crew spends time cleaning, not hunting for supplies." },
      { type: "quote", text: "The fastest turnover is the one you prepared for yesterday." },
      { type: "h2", text: "Document the finish" },
      { type: "p", text: "A timestamped photo report is your insurance policy. It proves the property was guest-ready and catches issues before a review does." },
    ],
  },
  {
    slug: "linen-par-levels",
    title: "Linen Par Levels: The Quiet Lever Behind 5-Star Reviews",
    excerpt:
      "Running out of fresh sheets is invisible to you and obvious to your guest. Here's how to size your linen inventory correctly.",
    category: "Guides",
    author: { name: "Nina Petrova", role: "Head of Product", avatar: "NP" },
    publishedAt: "2026-05-04",
    readingMinutes: 5,
    cover: "from-accent-400 to-accent-600",
    tags: ["linens", "inventory", "guides"],
    featured: false,
    body: [
      { type: "p", text: "Par level is the minimum quantity of an item you keep on hand to operate without interruption. For linens, getting it right is the difference between a calm turnover and a same-day laundromat run." },
      { type: "h2", text: "The 3x rule" },
      { type: "p", text: "Keep three full sets per bed: one on the bed, one in the wash, and one ready to deploy. It absorbs delays, damage and back-to-back bookings without a single gap." },
      { type: "h2", text: "Track wear, not just count" },
      { type: "p", text: "Linens fade and stain. Tracking condition — not just quantity — keeps your beds looking like the listing photos that earned the booking." },
    ],
  },
  {
    slug: "guest-ready-checklist",
    title: "The 50-Point Guest-Ready Checklist We Use on Every Visit",
    excerpt:
      "The exact standard our crews are trained on, distilled into a checklist you can adopt today.",
    category: "Guides",
    author: { name: "Daniele Conti", role: "Head of Quality", avatar: "DC" },
    publishedAt: "2026-04-21",
    readingMinutes: 8,
    cover: "from-ink-700 to-ink-900",
    tags: ["quality", "checklist", "standards"],
    featured: false,
    body: [
      { type: "p", text: "Quality isn't a feeling — it's a list. Below is the backbone of the 50-point standard every CasaClean turnover is measured against." },
      { type: "h2", text: "High-impact rooms first" },
      { type: "p", text: "Kitchens and bathrooms drive the majority of cleanliness complaints. They get the most attention and the strictest checks." },
      { type: "h2", text: "Finish with the details guests photograph" },
      { type: "p", text: "Folded toilet paper, aligned remotes, a staged welcome — small signals that tell a guest the whole place was cared for." },
    ],
  },
  {
    slug: "scaling-to-ten-listings",
    title: "Scaling From 1 to 10 Listings: What Actually Breaks",
    excerpt:
      "The bottlenecks that appear as you grow a short-term rental portfolio — and how to get ahead of them.",
    category: "Hosting",
    author: { name: "Lela Gorelishvili", role: "CEO", avatar: "LG" },
    publishedAt: "2026-04-02",
    readingMinutes: 7,
    cover: "from-brand-400 to-brand-600",
    tags: ["scaling", "portfolio", "hosting"],
    featured: false,
    body: [
      { type: "p", text: "The systems that work for one listing quietly collapse around your fourth. Here's where, and what to put in place before they do." },
      { type: "h2", text: "Communication is the first to go" },
      { type: "p", text: "Texting individual cleaners doesn't scale. Centralize scheduling and reporting before it becomes a full-time job." },
    ],
  },
  {
    slug: "automated-restocking",
    title: "Why We Automated Supply Restocking (And You Should Too)",
    excerpt:
      "An empty toiletry dispenser is a one-star review waiting to happen. Automation makes stockouts a thing of the past.",
    category: "Product",
    author: { name: "Nina Petrova", role: "Head of Product", avatar: "NP" },
    publishedAt: "2026-03-15",
    readingMinutes: 4,
    cover: "from-brand-600 to-ink-800",
    tags: ["restocking", "automation", "product"],
    featured: false,
    body: [
      { type: "p", text: "Consumables are the easiest thing to forget and the most jarring to run out of. Automating low-stock alerts removes the mental load entirely." },
    ],
  },
  {
    slug: "damage-disputes",
    title: "Winning Damage Disputes With Timestamped Evidence",
    excerpt:
      "Photo documentation on every visit changes who has the burden of proof. Here's how to use it.",
    category: "Operations",
    author: { name: "Marco Bianchi", role: "COO", avatar: "MB" },
    publishedAt: "2026-02-28",
    readingMinutes: 5,
    cover: "from-accent-500 to-accent-700",
    tags: ["damage", "disputes", "operations"],
    featured: false,
    body: [
      { type: "p", text: "When damage is documented the moment it appears, disputes stop being your word against a guest's. Evidence wins." },
    ],
  },
];

export const getPostBySlug = (slug) =>
  BLOG_POSTS.find((post) => post.slug === slug) ?? null;

export const getFeaturedPost = () =>
  BLOG_POSTS.find((post) => post.featured) ?? BLOG_POSTS[0];

export const getRelatedPosts = (slug, limit = 3) =>
  BLOG_POSTS.filter((post) => post.slug !== slug).slice(0, limit);
