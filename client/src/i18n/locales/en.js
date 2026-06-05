/*
 * English locale (source of truth)
 * --------------------------------
 * Every translatable string in the product. Other locales mirror this shape;
 * any key they omit falls back here, so partial translations never break the UI.
 * Values may be strings or arrays (e.g. feature lists).
 */

export default {
  common: {
    bookTurnover: "Book a turnover",
    callUs: "Call us",
    getStarted: "Get started",
    learnMore: "Learn more",
    readMore: "Read more",
    viewAll: "View all",
    loading: "Loading",
    submit: "Submit",
    send: "Send message",
    continue: "Continue",
    back: "Back",
    edit: "Edit",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    phone: "Phone",
    optional: "Optional",
    search: "Search",
    talkToTeam: "Talk to our team",
    talkToSales: "Talk to sales",
    from: "From",
    perTurnover: "/ turnover",
  },

  language: { label: "Language", select: "Select language" },

  theme: { label: "Theme", light: "Light", dark: "Dark" },

  profile: {
    title: "My profile",
    subtitle: "Manage your account details and preferences.",
    menu: "Profile",
    account: "Account",
    personalInfo: "Personal information",
    memberSince: "Member since",
    role: "Role",
    verified: "Verified",
    unverified: "Unverified",
    save: "Save changes",
    saved: "Your profile has been updated.",
    adminConsole: "Admin console",
    dangerZone: "Sign out of your account",
    bookingHistory: "Booking history",
    bookingHistorySubtitle: "Your past and upcoming cleanings.",
    noBookings: "No bookings yet",
    noBookingsHint: "When you book a cleaning, it will show up here.",
    bookNow: "Book a cleaning",
  },

  nav: {
    services: "Services",
    pricing: "Pricing",
    about: "About",
    blog: "Blog",
    faq: "FAQ",
    contact: "Contact",
    careers: "Careers",
    menu: "Menu",
  },

  footer: {
    blurb:
      "Premium turnover cleaning for vacation rentals. Trusted by hosts and property managers across 12+ cities to keep every listing guest-ready.",
    newsletterTitle: "Get hosting insights, monthly",
    subscribe: "Subscribe",
    subscribed: "You're subscribed — watch your inbox.",
    emailPlaceholder: "you@email.com",
    rights: "All rights reserved.",
    columns: {
      Company: "Company",
      Services: "Services",
      Resources: "Resources",
      Legal: "Legal",
    },
    links: {
      "About us": "About us",
      Careers: "Careers",
      Blog: "Blog",
      Contact: "Contact",
      "Turnover cleaning": "Turnover cleaning",
      "Linen management": "Linen management",
      Restocking: "Restocking",
      Inspections: "Inspections",
      Pricing: "Pricing",
      FAQ: "FAQ",
      "Book a turnover": "Book a turnover",
      "Privacy policy": "Privacy policy",
      "Terms of service": "Terms of service",
    },
  },

  auth: {
    panelTitle: "Turnovers, handled.",
    panelSubtitle:
      "Join thousands of hosts who trust CasaClean to keep every listing guest-ready.",
    panelStat1: "48,000+ turnovers completed",
    panelStat2: "4.97★ average host rating",
    panelStat3: "99.6% on-time arrival",
    orContinueWith: "or continue with",
    google: "Continue with Google",
    backToSite: "Back to site",
    signin: {
      title: "Welcome back",
      subtitle: "Sign in to manage your turnovers and properties.",
      submit: "Sign in",
      forgot: "Forgot password?",
      noAccount: "New to CasaClean?",
      createAccount: "Create an account",
      success: "Signed in successfully. Redirecting…",
    },
    signup: {
      title: "Create your account",
      subtitle: "Start booking guest-ready turnovers in minutes.",
      submit: "Create account",
      haveAccount: "Already have an account?",
      signInInstead: "Sign in",
      terms: "By creating an account you agree to our Terms and Privacy Policy.",
      success: "Account created! Please check your email to verify.",
      verifyNote:
        "We sent a verification link to your inbox. Open it to activate your account — you'll be signed in and taken home automatically.",
    },
    fields: {
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      password: "Password",
      confirmPassword: "Confirm password",
      rememberMe: "Remember me",
    },
    placeholders: {
      fullName: "Lela Gorelishvili",
      email: "you@email.com",
      phone: "+39 ...",
      password: "••••••••",
    },
    errors: {
      nameMin: "Please enter your full name",
      emailInvalid: "Enter a valid email address",
      phoneInvalid: "Enter a valid phone number",
      passwordMin: "Password must be at least 8 characters",
      passwordUpper: "Include at least one uppercase letter",
      passwordNumber: "Include at least one number",
      passwordMatch: "Passwords don't match",
      generic: "Something went wrong. Please try again.",
    },
  },

  hero: {
    badge: "Now serving 12 cities across Italy",
    titleA: "Guest-ready turnovers,",
    titleHighlight: "every single time",
    subtitle:
      "CasaClean handles cleaning, linens, restocking and inspections for your short-term rentals — so every guest walks into a five-star space and you never lift a finger.",
    ctaPrimary: "Book a turnover",
    ctaSecondary: "See how it works",
    ratingText: "from 1,280+ hosts",
    guarantee: "Guest-Ready Guarantee",
    cardLabel: "Property turnover",
    cardStatus: "Guest-ready ✓",
    cardStatusLabel: "Status",
    cardRatingLabel: "Avg. guest cleanliness",
  },

  trustedBy: {
    label: "Trusted by hosts and managers on the platforms you already use",
  },

  servicesSection: {
    eyebrow: "What we do",
    title: "Everything a turnover needs, under one roof",
    subtitle:
      "Mix and match the services your listings need. One vendor, one dashboard, one standard.",
    exploreAll: "Explore all services",
    bookNow: "Book now",
    mostBooked: "Most booked",
  },

  why: {
    eyebrow: "Why CasaClean",
    title: "The reliability of an in-house team, without the overhead",
    subtitle:
      "We obsess over the operational details so your reviews stay five stars and your time stays yours.",
    items: {
      reliability: {
        title: "Reliability you can schedule around",
        description:
          "Vetted crews, calendar sync and a 99.6% on-time rate mean turnovers happen — even on same-day back-to-backs.",
      },
      standards: {
        title: "A standard you can prove",
        description:
          "Every clean follows a 50-point checklist and ends in a photo report, so quality is documented, not assumed.",
      },
      allinone: {
        title: "One vendor, every turnover task",
        description:
          "Cleaning, linens, restocking and inspections under one roof — and one dashboard across all your listings.",
      },
      guarantee: {
        title: "The Guest-Ready Guarantee",
        description:
          "If a turnover isn't right, we re-clean within 24 hours or refund the visit. Your reviews are protected.",
      },
    },
  },

  workflow: {
    eyebrow: "How it works",
    title: "From booking to guest-ready in four steps",
    subtitle:
      "A turnover workflow designed to disappear into the background of your hosting.",
    items: {
      book: {
        title: "Book in minutes",
        description:
          "Tell us about your property and pick a time. Sync your calendar so turnovers auto-schedule after each checkout.",
      },
      clean: {
        title: "We turn it over",
        description:
          "A vetted crew arrives on time and resets your space to our 50-point, five-star hospitality standard.",
      },
      inspect: {
        title: "Inspect & document",
        description:
          "Every visit ends with a timestamped photo report — damage flagged, supplies logged, lost items recorded.",
      },
      relax: {
        title: "Guest-ready, guaranteed",
        description:
          "Your listing is staged, stocked and spotless. If anything's off, we re-clean within 24 hours — no charge.",
      },
    },
  },

  timeline: {
    eyebrow: "On-site process",
    title: "A documented timeline, every visit",
    subtitle:
      "No guesswork about what gets done. Here's exactly how a CasaClean turnover unfolds.",
    items: {
      arrival: {
        title: "Arrival & walkthrough",
        description:
          "Crew checks in, documents the property's condition on entry, and reviews any host notes from the last guest.",
      },
      strip: {
        title: "Strip & laundry",
        description:
          "Used linens and towels are removed, fresh hotel-grade sets are staged, and laundry is started or swapped.",
      },
      "kitchen-bath": {
        title: "Kitchen & bathrooms",
        description:
          "Deep sanitation of the highest-impact rooms: appliances, fixtures, surfaces and high-touch points.",
      },
      living: {
        title: "Living spaces & beds",
        description:
          "Floors, dusting, bed making with a hotel fold, and a careful reset of every shared space.",
      },
      restock: {
        title: "Restock & stage",
        description:
          "Consumables replenished, welcome amenities staged, lighting and ambiance set for arrival.",
      },
      inspect: {
        title: "Inspection & report",
        description:
          "Final 50-point check, timestamped photos captured, and your guest-ready confirmation sent.",
      },
    },
  },

  beforeAfter: {
    eyebrow: "The CasaClean difference",
    title: "See the transformation",
    subtitle:
      "Drag to compare a post-checkout space with a CasaClean guest-ready turnover.",
    before: "Before",
    after: "After",
  },

  stats: {
    turnovers: "Turnovers completed",
    rating: "Average host rating",
    ontime: "On-time arrival rate",
    cities: "Cities served",
  },

  testimonialsSection: {
    eyebrow: "Loved by hosts",
    title: "Hosts don't just like us — they rebook",
    subtitle: "Real words from the operators who trust CasaClean with their guests.",
  },

  testimonials: {
    t1: {
      quote:
        "CasaClean turned our turnover chaos into a non-event. Same-day cleans, photo reports before each guest, and our review scores have never been higher.",
      metric: "4.97★ average rating",
    },
    t2: {
      quote:
        "We replaced three vendors with one platform. The inspection photos alone have saved us thousands in disputed damage claims.",
      metric: "31% fewer guest complaints",
    },
    t3: {
      quote:
        "I book a turnover in under a minute and forget about it. Linens, restocking, the works — my guests think I have a full-time housekeeper.",
      metric: "12 hrs/week saved",
    },
    t4: {
      quote:
        "Reliability is everything when you're scaling. CasaClean has never missed a turnover in 14 months — that consistency is worth a premium.",
      metric: "100% on-time turnovers",
    },
    t5: {
      quote:
        "The dashboard gives me a single view across every property. Onboarding a new listing now takes minutes instead of an afternoon.",
      metric: "9 listings, one login",
    },
  },

  faqSection: {
    eyebrow: "Questions, answered",
    title: "The things hosts ask us most",
    subtitle: "Can't find what you need? Our team is one message away.",
    readAll: "Read all FAQs",
  },

  cta: {
    eyebrow: "Ready when you are",
    title: "Your next guest deserves a flawless space.",
    subtitle:
      "Book a turnover in under two minutes — no contracts, no commitments, just a guest-ready home.",
    primary: "Book a turnover",
    secondary: "Talk to our team",
  },

  // ----- Service catalog content (keyed by service id) -----
  services: {
    1: {
      name: "Turnover Cleaning",
      tagline: "Guest-ready in hours, not days",
      description:
        "A complete reset between guests — every surface, every room, to a five-star hospitality standard.",
      features: [
        "Full kitchen & bathroom sanitation",
        "Bed making with hotel-fold finish",
        "Floors, surfaces & high-touch points",
        "Trash removal & odor neutralization",
      ],
    },
    2: {
      name: "Linen Management",
      tagline: "Hotel-grade linen, always fresh",
      description:
        "Commercial laundering, par-level tracking and swap-on-arrival linen so every guest sleeps on crisp, fresh sheets.",
      features: [
        "Commercial wash & press",
        "Par-level inventory tracking",
        "Stain & wear replacement",
        "Fresh sets delivered per turnover",
      ],
    },
    3: {
      name: "Supply Restocking",
      tagline: "Never run out of the essentials",
      description:
        "We monitor and replenish consumables — from coffee to toiletries — so your listing is always fully stocked.",
      features: [
        "Toiletries & bathroom amenities",
        "Kitchen & coffee consumables",
        "Cleaning & paper supplies",
        "Automated low-stock alerts",
      ],
    },
    4: {
      name: "Property Inspection",
      tagline: "A 50-point check, every visit",
      description:
        "Photo-documented inspections catch damage, maintenance issues and missing items before your next guest does.",
      features: [
        "50-point quality checklist",
        "Timestamped photo report",
        "Damage & maintenance flagging",
        "Lost-and-found handling",
      ],
    },
    5: {
      name: "Deep Cleaning",
      tagline: "A seasonal reset that shows",
      description:
        "An exhaustive top-to-bottom clean — appliances, grout, baseboards and the spots a standard turnover skips.",
      features: [
        "Inside appliances & cabinets",
        "Grout, baseboards & vents",
        "Window interiors & tracks",
        "Upholstery & soft furnishings",
      ],
    },
    6: {
      name: "Guest-Ready Prep",
      tagline: "The finishing touches that earn 5 stars",
      description:
        "Staging, welcome setup and a final walkthrough so your space photographs and reviews as well as it cleans.",
      features: [
        "Welcome amenity staging",
        "Lighting & ambiance setup",
        "Final styling walkthrough",
        "Listing-photo consistency check",
      ],
    },
  },

  // ----- FAQ content -----
  faq: {
    categories: {
      "getting-started": "Getting started",
      "pricing-billing": "Pricing & billing",
      "quality-trust": "Quality & trust",
    },
    items: {
      q1: {
        question: "How quickly can you turn over my property?",
        answer:
          "Most turnovers are completed within 3–4 hours of guest checkout. With a confirmed schedule, we can have your property guest-ready the same day — even for back-to-back bookings.",
      },
      q2: {
        question: "Which areas do you currently serve?",
        answer:
          "We operate across major Italian short-term rental markets including Rome, Florence, Milan, Naples and Venice, and we add new cities every quarter. Enter your address at booking to confirm coverage.",
      },
      q3: {
        question: "Do I need to be present for the cleaning?",
        answer:
          "No. The vast majority of our hosts use smart locks or key handoffs. We document entry and exit with timestamped photos, so you always have a record without lifting a finger.",
      },
      q4: {
        question: "How does pricing work?",
        answer:
          "You can pay per turnover or save with a managed monthly plan. Per-turnover pricing is based on property size and the services you select — there are no contracts and no hidden fees.",
      },
      q5: {
        question: "Are supplies and linens included?",
        answer:
          "You choose. We can use your supplies and linens, or provide hotel-grade linens and consumables as an add-on. Restocking is tracked automatically so you never run out.",
      },
      q6: {
        question: "Is there a cancellation fee?",
        answer:
          "Cancellations made more than 24 hours before a scheduled turnover are free. Inside 24 hours, a 50% fee applies to cover the reserved crew slot.",
      },
      q7: {
        question: "What if I'm not satisfied with a clean?",
        answer:
          "Every turnover is backed by our Guest-Ready Guarantee. If something isn't right, we'll re-clean within 24 hours at no charge — or refund the visit.",
      },
      q8: {
        question: "Are your cleaners vetted and insured?",
        answer:
          "Yes. Every professional is background-checked, trained on our 50-point standard, and fully insured. We carry liability coverage on every visit for your peace of mind.",
      },
      q9: {
        question: "How do you handle damage or lost items?",
        answer:
          "Our inspection reports flag damage with photos the moment it's found, and lost-and-found items are logged and stored. You'll have documentation before your next guest arrives.",
      },
    },
  },

  // ----- Per-page (heroes + section headings) -----
  pages: {
    services: {
      heroEyebrow: "Our services",
      heroTitle: "Full-service operations for short-term rentals",
      heroSubtitle:
        "From a single turnover to fully managed linens, restocking and inspections — choose exactly what your listings need.",
      processEyebrow: "The process",
      processTitle: "Effortless from the first booking",
      processSubtitle:
        "However many services you choose, the experience is the same: simple, reliable, documented.",
      includedEyebrow: "Always included",
      includedTitle: "Every turnover, guaranteed",
      includedSubtitle: "No matter which services you book, these come standard.",
      included: [
        "Vetted, background-checked professionals",
        "50-point quality checklist",
        "Timestamped photo completion report",
        "Full liability insurance on every visit",
        "Damage & lost-item documentation",
        "Guest-Ready Guarantee or we re-clean free",
      ],
      ctaTitle: "Build the turnover plan your listings deserve",
      ctaSubtitle:
        "Tell us about your property and we'll recommend the right mix of services.",
    },
    pricing: {
      heroEyebrow: "Pricing",
      heroTitle: "Simple pricing that scales with you",
      heroSubtitle:
        "Pay per turnover or save with a managed plan. No contracts, no setup fees, no surprises.",
      disclaimer:
        "Prices shown are starting points and vary by property size. You'll see an exact quote before you confirm any booking.",
      addonsEyebrow: "Add-ons",
      addonsTitle: "Tailor any plan with extras",
      addonsSubtitle: "Layer on exactly what a listing needs, when it needs it.",
      faqEyebrow: "Pricing FAQ",
      faqTitle: "Good to know",
      ctaTitle: "Start with a single turnover",
      ctaSubtitle:
        "No plan required. Book one clean, see the difference, scale when you're ready.",
    },
    about: {
      heroEyebrow: "Our story",
      heroTitle: "We built the operations partner we wished we had",
      heroSubtitle:
        "CasaClean started with three crews and a five-star obsession. Today we keep thousands of listings guest-ready across Italy.",
      missionLabel: "Our mission",
      mission:
        "To make running a short-term rental feel effortless — so hosts can grow their business while every guest walks into a flawless space.",
      valuesEyebrow: "What we value",
      valuesTitle: "The principles behind every turnover",
      milestonesEyebrow: "Milestones",
      milestonesTitle: "How we got here",
      teamEyebrow: "Leadership",
      teamTitle: "The people behind CasaClean",
      ctaTitle: "Join thousands of hosts who trust CasaClean",
      ctaSubtitle: "Experience the operations partner built for short-term rentals.",
    },
    contact: {
      heroEyebrow: "Contact",
      heroTitle: "Let's get your turnovers handled",
      heroSubtitle:
        "Questions about coverage, pricing or onboarding a portfolio? We're here to help.",
      emailLabel: "Email us",
      emailNote: "We reply within one business day",
      phoneLabel: "Call us",
      phoneNote: "Mon–Sat, 9:00–18:00 CET",
      visitLabel: "Visit",
      visitNote: "By appointment",
      pmTitle: "Property manager?",
      pmNote: "Ask about volume pricing and our multi-property dashboard.",
      formTitle: "Send us a message",
      formSubtitle: "Fill in the form and we'll be in touch shortly.",
      successTitle: "Message sent",
      successBody:
        "Thanks for reaching out — a member of our team will get back to you within one business day.",
      fields: {
        name: "Full name",
        email: "Email",
        phone: "Phone",
        topic: "Topic",
        message: "How can we help?",
        messagePlaceholder: "Tell us about your property and what you need…",
        topicPlaceholder: "Select a topic",
      },
      topics: {
        general: "General enquiry",
        booking: "Booking a turnover",
        pricing: "Pricing & plans",
        partnership: "Property manager / partnership",
        support: "Existing customer support",
      },
    },
    faq: {
      heroEyebrow: "Help center",
      heroTitle: "Frequently asked questions",
      heroSubtitle:
        "Everything you need to know about working with CasaClean. Still stuck? Reach out anytime.",
      ctaEyebrow: "Still have questions?",
      ctaTitle: "We're a message away",
      ctaSubtitle:
        "Our team responds within one business day — usually much sooner.",
    },
    careers: {
      heroEyebrow: "Careers",
      heroTitle: "Build the operating system for short-term rentals",
      heroSubtitle:
        "We're a team that takes pride in the craft of hospitality operations. Come do the best work of your career.",
      seeRoles: "See open roles",
      perksEyebrow: "Why join us",
      perksTitle: "More than a job — a place to grow",
      rolesEyebrow: "Open positions",
      rolesTitle: "Find your role",
      apply: "Apply",
      noRolesTitle: "No open roles right now",
      noRolesBody:
        "We're always meeting great people. Send us your CV and we'll reach out when something fits.",
      getInTouch: "Get in touch",
      ctaEyebrow: "Don't see your role?",
      ctaTitle: "We're always looking for great people",
      ctaSubtitle:
        "Tell us how you'd make CasaClean better and we'll find a way to talk.",
      sendCv: "Send your CV",
      learnAbout: "Learn about us",
    },
    blog: {
      heroEyebrow: "The CasaClean blog",
      heroTitle: "Playbooks for flawless rental operations",
      heroSubtitle:
        "Checklists, data and hard-won lessons to help you run a five-star short-term rental.",
      searchPlaceholder: "Search articles…",
      noResultsTitle: "No articles found",
      noResultsBody: "Try a different category or search term.",
      minRead: "min read",
      allArticles: "All articles",
      relatedEyebrow: "Keep reading",
      relatedTitle: "Related articles",
      notFoundTitle: "Article not found",
      notFoundBody: "This post may have been moved or removed.",
      backToBlog: "Back to blog",
      ctaEyebrow: "Put it into practice",
      ctaTitle: "Stop reading about great turnovers. Book one.",
      ctaSubtitle: "See the CasaClean standard on your own listing.",
    },
    notFound: {
      code: "404",
      title: "This page checked out early",
      subtitle:
        "The page you're looking for doesn't exist or has moved. Let's get you back to a clean space.",
      home: "Back home",
      services: "Browse services",
      goBack: "Go back",
    },
  },

  // ----- Pricing plans (keyed by plan id) -----
  pricingPlans: {
    payg: {
      name: "Pay As You Go",
      description: "Perfect for occasional hosts who want flexibility.",
      cadence: "Billed per clean",
      cta: "Book a turnover",
      features: [
        "Standard turnover cleaning",
        "Bed making & tidy",
        "Trash removal",
        "Photo completion report",
        "Guest-Ready Guarantee",
      ],
    },
    host: {
      name: "Host",
      description: "For active hosts running one to three listings.",
      cadence: "Billed monthly · save 20%",
      badge: "Most popular",
      cta: "Start with Host",
      features: [
        "Everything in Pay As You Go",
        "Priority same-day scheduling",
        "Linen management included",
        "Supply restocking & alerts",
        "50-point inspection reports",
        "Dedicated support line",
      ],
    },
    portfolio: {
      name: "Portfolio",
      description: "Managed operations for 4+ units and property managers.",
      cadence: "Tailored to your portfolio",
      unit: "Custom",
      cta: "Talk to sales",
      features: [
        "Everything in Host",
        "Volume pricing across units",
        "Single multi-property dashboard",
        "Dedicated account manager",
        "API & PMS integrations",
        "Custom SLAs & reporting",
      ],
    },
  },

  pricingAddons: {
    deep: { label: "Deep clean", note: "Seasonal top-to-bottom reset" },
    linen: { label: "Hotel-grade linens", note: "Per turnover, swapped on arrival" },
    restock: { label: "Supply restocking", note: "Consumables tracked & replenished" },
    staging: { label: "Guest-ready staging", note: "Welcome setup & final styling" },
  },

  // ----- Company (values, milestones, leadership) -----
  values: {
    hospitality: {
      title: "Hospitality first",
      description:
        "We treat every property like a five-star stay — because your guests' reviews depend on it.",
    },
    accountability: {
      title: "Radical accountability",
      description:
        "Photo reports on every visit. If we miss something, we own it and make it right, fast.",
    },
    craft: {
      title: "Pride in the craft",
      description:
        "Cleaning is a skill. We train, certify and reward the professionals who do it brilliantly.",
    },
    scale: {
      title: "Built to scale with you",
      description:
        "From one listing to a hundred, our operations and tooling grow without dropping a turnover.",
    },
  },

  milestones: {
    m1: { title: "Founded in Rome", description: "Started with three crews and a five-star obsession." },
    m2: { title: "1,000th turnover", description: "Expanded to Florence and Milan within the first year." },
    m3: { title: "Inspection platform", description: "Launched photo-documented 50-point inspections." },
    m4: { title: "12 cities, 48k+ cleans", description: "Became the operations partner of choice for managers." },
  },

  leadership: {
    founder: { role: "Co-founder & CEO", bio: "Former hospitality operations lead who scaled turnover teams across 200+ short-term rentals." },
    ops: { role: "Co-founder & COO", bio: "Built and ran multi-city field operations for an on-demand logistics company." },
    product: { role: "Head of Product", bio: "Product leader focused on tools that make complex operations feel effortless." },
    quality: { role: "Head of Quality", bio: "Defined the 50-point standard that every CasaClean turnover is measured against." },
  },

  // ----- Careers (perks + roles) -----
  perks: {
    p1: { title: "Above-market pay", description: "Competitive base, performance bonuses and paid travel time." },
    p2: { title: "Flexible scheduling", description: "Choose shifts that fit your life — full-time or part-time." },
    p3: { title: "Paid training", description: "Get certified on our 50-point standard, fully paid." },
    p4: { title: "Health & insurance", description: "Coverage and full liability insurance on every visit." },
    p5: { title: "Real growth paths", description: "Crew lead, trainer and regional ops roles, promoted from within." },
    p6: { title: "A team that has your back", description: "Supportive crews and responsive ops support, always." },
  },

  roleTypes: {
    "Full-time": "Full-time",
    "Part-time": "Part-time",
  },

  teams: {
    Operations: "Operations",
    Quality: "Quality",
    Engineering: "Engineering",
    "Customer Success": "Customer Success",
  },

  // ----- Booking wizard -----
  booking: {
    backToSite: "Back to site",
    title: "Book your turnover",
    subtitle:
      "A guest-ready clean in a few quick steps. No payment required to request — you'll confirm details with our team.",
    continue: "Continue",
    back: "Back",
    confirm: "Confirm booking",
    steps: {
      property: { title: "Property details", subtitle: "Where are we cleaning?" },
      preferences: { title: "Cleaning preferences", subtitle: "Tailor the turnover" },
      schedule: { title: "Schedule", subtitle: "Pick a date and time" },
      contact: { title: "Your details", subtitle: "Where to reach you" },
      review: { title: "Review", subtitle: "Confirm everything looks right" },
    },
    quote: {
      title: "Your quote",
      subtitle: "Updates as you build your booking.",
      empty: "Select a service to see your estimate.",
      total: "Estimated total",
      guarantee:
        "Backed by the Guest-Ready Guarantee. Free cancellation up to 24h before.",
    },
    confirmation: {
      title: "Booking confirmed!",
      body:
        "your turnover is booked. We've emailed your confirmation and we'll be in touch with the crew's arrival window.",
      reference: "Booking reference",
      total: "total",
      home: "Back to home",
      more: "Explore more services",
    },
  },
};
