/*
 * English locale (source of truth)
 * --------------------------------
 * Every translatable string in the product. Other locales mirror this shape;
 * any key they omit falls back here, so partial translations never break the UI.
 * Values may be strings or arrays (e.g. feature lists).
 */

export default {
  common: {
    bookTurnover: "Book a cleaning",
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
    close: "Close",
    talkToTeam: "Talk to our team",
    talkToSales: "Talk to sales",
    from: "From",
    perTurnover: "/ visit",
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
    payments: {
      title: "Payment methods",
      add: "Add card",
      addTitle: "Add a payment method",
      save: "Save card",
      empty: "No saved cards yet.",
      remove: "Remove card",
      error: "We couldn't save your card. Please try again.",
      default: "Default",
      makeDefault: "Make default",
    },
    subscriptions: {
      title: "My subscriptions",
      subtitle: "Manage your recurring cleaning visits and payment card.",
      empty: "You don't have any recurring cleanings yet.",
      error: "We couldn't update your subscription. Please try again.",
      serviceFallback: "Cleaning service",
      everyDays: "Every {days} days",
      nextService: "Next service",
      nextCharge: "Next charge",
      lastCharge: "Last charge",
      chargeSucceeded: "Paid",
      chargeFailed: "Payment failed",
      paymentPaused: "This subscription is paused because its card needs attention. Update your card, then resume it.",
      goToCards: "Go to saved cards",
      pause: "Pause",
      resume: "Resume",
      cancel: "Cancel subscription",
      updateCard: "Update card",
      updateCardTitle: "Choose a card for this subscription",
      updateCardDescription: "Select one of your saved cards. You can add a new one in Payment methods.",
      noCards: "No saved cards are available yet.",
      cancelTitle: "Cancel this subscription?",
      cancelBody: "This stops future {service} visits. Already paid visits stay unchanged.",
      cancelConfirm: "Yes, cancel subscription",
      keep: "Keep subscription",
      status: {
        active: "Active",
        paused: "Paused",
        cancelled: "Cancelled",
      },
    },
    security: {
      title: "Security",
      changePassword: "Change password",
      changeTitle: "Change your password",
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      changed: "Password updated. Your other devices have been signed out.",
      deleteAccount: "Delete account",
      deleteTitle: "Delete your account",
      deleteWarning:
        "This permanently deletes your account and your reviews. It can't be undone. Cancel any upcoming bookings first.",
      deletePassword: "Confirm with your password",
      deleteConfirm: "Delete my account",
    },
    dangerZone: "Sign out of your account",
    bookingHistory: "Booking history",
    bookingHistorySubtitle: "Your past and upcoming cleanings.",
    noBookings: "No bookings yet",
    noBookingsHint: "When you book a cleaning, it will show up here.",
    bookNow: "Book a cleaning",
    cancelBooking: "Cancel",
    cancelTitle: "Cancel this booking?",
    cancelBody: "This will cancel your {service} cleaning on {date}. This can't be undone.",
    cancelConfirm: "Yes, cancel booking",
    keepBooking: "Keep booking",
    cancelError: "We couldn't cancel this booking. Please try again.",
    rate: "Rate",
    yourRating: "Your rating",
    rateTitle: "Rate your booking",
    rateSubtitle: "How was your {service} cleaning on {date}?",
    ratingLabel: "Your rating",
    rateStars: "{count} star rating",
    commentLabel: "Your review",
    commentPlaceholder: "Tell us how it went…",
    submitReview: "Submit review",
    reviewError: "We couldn't submit your review. Please try again.",
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
      "Professional home and office cleaning across Italy. Vetted, insured cleaners, transparent prices and a guarantee behind every visit.",
    newsletterTitle: "Get home care tips, monthly",
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
      "Home cleaning": "Home cleaning",
      "Deep cleaning": "Deep cleaning",
      "Office cleaning": "Office cleaning",
      "Move-out cleaning": "Move-out cleaning",
      Pricing: "Pricing",
      FAQ: "FAQ",
      "Book a cleaning": "Book a cleaning",
      "Privacy policy": "Privacy policy",
      "Terms of service": "Terms of service",
    },
  },

  auth: {
    panelTitle: "Cleaning, handled.",
    panelSubtitle:
      "Join thousands of customers who trust CasaClean to keep their homes and offices spotless.",
    panelStat1: "48,000+ cleans completed",
    panelStat2: "4.97★ average customer rating",
    panelStat3: "99.6% on-time arrival",
    orContinueWith: "or continue with",
    google: "Continue with Google",
    backToSite: "Back to site",
    signin: {
      title: "Welcome back",
      subtitle: "Sign in to manage your bookings and preferences.",
      submit: "Sign in",
      forgot: "Forgot password?",
      noAccount: "New to CasaClean?",
      createAccount: "Create an account",
      success: "Signed in successfully. Redirecting…",
    },
    signup: {
      title: "Create your account",
      subtitle: "Book your first cleaning in minutes.",
      submit: "Create account",
      haveAccount: "Already have an account?",
      signInInstead: "Sign in",
      terms: "By creating an account you agree to our Terms and Privacy Policy.",
      success: "Account created! Please check your email to verify.",
      verifyNote:
        "We sent a verification link to your inbox. Open it to activate your account — you'll be signed in and taken home automatically.",
    },
    forgot: {
      title: "Forgot your password?",
      subtitle: "Enter your account email and we'll send you a link to reset it.",
      submit: "Send reset link",
      success: "If an account exists for that email, a reset link is on its way — check your inbox.",
      back: "Back to sign in",
    },
    reset: {
      title: "Choose a new password",
      subtitle: "The link works once and expires after 30 minutes.",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      submit: "Reset password",
      invalid: "This reset link is invalid or has expired.",
      requestNew: "Request a new link",
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
    titleA: "A spotless home,",
    titleHighlight: "without lifting a finger",
    subtitle:
      "Book a vetted, insured cleaning professional for your home or office in about 60 seconds. Transparent prices, your language spoken, and every visit backed by our Spotless Guarantee.",
    ctaPrimary: "Book a cleaning",
    ctaSecondary: "See how it works",
    ratingText: "from 1,280+ customers",
    guarantee: "Spotless Guarantee",
    cardLabel: "Home cleaning",
    cardStatus: "Spotless ✓",
    cardStatusLabel: "Status",
    cardRatingLabel: "Avg. customer rating",
  },

  trustedBy: {
    label: "Rated excellent by customers on the platforms you already know",
  },

  servicesSection: {
    eyebrow: "What we do",
    title: "Every kind of clean, one trusted team",
    subtitle:
      "From a weekly home refresh to office contracts and end-of-lease deep cleans — pick what you need, we handle the rest.",
    exploreAll: "Explore all services",
    bookNow: "Book now",
    mostBooked: "Most booked",
  },

  why: {
    eyebrow: "Why CasaClean",
    title: "Cleaning you can finally stop thinking about",
    subtitle:
      "We sweat the small stuff — vetting, scheduling, quality — so booking a cleaner feels as easy as ordering a taxi.",
    items: {
      reliability: {
        title: "On time, every time",
        description:
          "Punctual professionals, live scheduling and a 99.6% on-time arrival rate — even for same-day requests.",
      },
      standards: {
        title: "Background-checked professionals",
        description:
          "Every cleaner is identity-verified, background-checked, insured and trained on our 50-point standard before their first visit.",
      },
      allinone: {
        title: "One team for home and office",
        description:
          "Regular cleaning, deep cleans, offices, move-outs, laundry and disinfection — one booking, one invoice, one standard.",
      },
      guarantee: {
        title: "The Spotless Guarantee",
        description:
          "Not happy with a clean? Tell us within 48 hours and we'll re-clean for free — or refund the visit.",
      },
    },
  },

  workflow: {
    eyebrow: "How it works",
    title: "From booking to sparkling in four steps",
    subtitle:
      "Booking a cleaner shouldn't feel like a chore. Here's the whole experience.",
    items: {
      book: {
        title: "Book online in 60 seconds",
        description:
          "Choose your service, tell us about your place and pick a time. You see the exact price before you confirm.",
      },
      clean: {
        title: "Get matched with a pro",
        description:
          "We assign a vetted, background-checked cleaner who fits your schedule — with your language and preferences in mind.",
      },
      inspect: {
        title: "We make it shine",
        description:
          "Your cleaner works through our 50-point checklist, starting with the priorities you flagged in your booking.",
      },
      relax: {
        title: "Rate it — it's guaranteed",
        description:
          "Review your clean afterwards. If anything's not right, we'll re-clean within 48 hours at no charge.",
      },
    },
  },

  timeline: {
    eyebrow: "On-site process",
    title: "What happens during your clean",
    subtitle:
      "No mystery about where the hours go. Here's how a typical CasaClean visit unfolds.",
    items: {
      arrival: {
        title: "Arrival & walkthrough",
        description:
          "Your cleaner arrives on time, reviews your booking notes, and confirms priorities and any no-go areas.",
      },
      strip: {
        title: "Tidy & dust",
        description:
          "Surfaces are decluttered and dusted top to bottom — shelves, frames, skirting boards and the forgotten corners.",
      },
      "kitchen-bath": {
        title: "Kitchen & bathrooms",
        description:
          "The rooms that matter most: degreasing, descaling and sanitizing appliances, fixtures and high-touch surfaces.",
      },
      living: {
        title: "Bedrooms & living areas",
        description:
          "Beds made, mirrors polished, furniture wiped and every room reset to calm.",
      },
      restock: {
        title: "Floors & finishing touches",
        description:
          "Vacuuming and mopping throughout, bins emptied and everything returned to its place.",
      },
      inspect: {
        title: "Final check & feedback",
        description:
          "A last pass against the checklist, then you rate the visit — your feedback shapes every clean that follows.",
      },
    },
  },

  beforeAfter: {
    eyebrow: "The CasaClean difference",
    title: "See the transformation",
    subtitle:
      "Drag to compare an everyday lived-in room with the same space after a CasaClean visit.",
    before: "Before",
    after: "After",
  },

  stats: {
    turnovers: "Cleans completed",
    rating: "Average customer rating",
    ontime: "On-time arrival rate",
    cities: "Cities served",
  },

  testimonialsSection: {
    eyebrow: "Loved by customers",
    title: "Customers don't just like us — they rebook",
    subtitle: "Real words from the homes and offices that trust CasaClean.",
  },

  testimonials: {
    t1: {
      quote:
        "Coming home on Friday to a spotless apartment has genuinely changed our week. Same cleaner every visit, and she knows exactly how we like things.",
      metric: "Weekly customer for 2 years",
    },
    t2: {
      quote:
        "Our studio is cleaned before the team arrives, invoiced once a month, zero chasing. Switching to CasaClean removed a whole task from my job.",
      metric: "3 locations, one invoice",
    },
    t3: {
      quote:
        "I booked in English in about a minute, and my cleaner spoke English too — no awkward translation apps. My flat has never looked better.",
      metric: "Booked in under a minute",
    },
    t4: {
      quote:
        "Their move-out cleans are so thorough my tenants get their deposits back without a single dispute. I book one for every changeover now.",
      metric: "Full deposits returned",
    },
    t5: {
      quote:
        "The deep clean reached places I haven't managed in years — inside the oven, behind the furniture, all of it. Kind, careful people.",
      metric: "4.97★ after 40+ visits",
    },
  },

  faqSection: {
    eyebrow: "Questions, answered",
    title: "The things customers ask us most",
    subtitle: "Can't find what you need? Our team is one message away.",
    readAll: "Read all FAQs",
  },

  cta: {
    eyebrow: "Ready when you are",
    title: "You have better things to do than scrub.",
    subtitle:
      "Book a vetted cleaner in about a minute — no contracts, no commitments, just a spotless place.",
    primary: "Book a cleaning",
    secondary: "Talk to our team",
  },

  // ----- Service catalog content (keyed by service id) -----
  services: {
    1: {
      name: "Home Cleaning",
      tagline: "Your regular clean, made effortless",
      description:
        "A thorough clean of your whole home — kitchen, bathrooms, bedrooms and living areas — as a one-off or on a schedule that suits you.",
      features: [
        "Kitchen & bathroom sanitation",
        "Dusting, vacuuming & mopping",
        "Beds made & rooms reset",
        "Bins emptied & surfaces polished",
      ],
    },
    2: {
      name: "Deep Cleaning",
      tagline: "For when it needs more than a once-over",
      description:
        "An intensive top-to-bottom clean — inside appliances, limescale, grout and all the spots a regular clean doesn't reach.",
      features: [
        "Inside oven, fridge & cabinets",
        "Limescale, grout & tile treatment",
        "Skirting boards, doors & vents",
        "Under & behind furniture",
      ],
    },
    3: {
      name: "Office Cleaning",
      tagline: "A workspace your team enjoys",
      description:
        "Reliable cleaning for offices, studios and shops — scheduled around your working hours, with one simple monthly invoice.",
      features: [
        "Desks, meeting rooms & kitchens",
        "High-touch points sanitized",
        "Evening & early-morning slots",
        "Monthly invoicing available",
      ],
    },
    4: {
      name: "Move-In / Move-Out Cleaning",
      tagline: "Leave nothing behind but shine",
      description:
        "A rigorous end-of-lease clean that helps deposits come back in full and new chapters start fresh — landlord-checklist thorough.",
      features: [
        "Full-property deep clean",
        "Inside all appliances & storage",
        "Windows, frames & doors",
        "Deposit-friendly documentation",
      ],
    },
    5: {
      name: "Laundry & Ironing",
      tagline: "Fresh, folded and put away",
      description:
        "Add washing, ironing and folding to any cleaning visit — or book it on its own. Your wardrobe and linen cupboard, handled.",
      features: [
        "Wash, dry & fold",
        "Ironing & garment care",
        "Bed linen & towel rotation",
        "Add-on to any cleaning",
      ],
    },
    6: {
      name: "Sanitization & Disinfection",
      tagline: "Certified clean, down to the details",
      description:
        "Professional-grade disinfection of high-touch surfaces for homes and workplaces — ideal after illness, tenants or renovations.",
      features: [
        "Certified professional disinfectants",
        "High-touch surface treatment",
        "Kitchen & bathroom focus",
        "Suitable for homes & offices",
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
        question: "Do I need to be home during the cleaning?",
        answer:
          "It's completely up to you. Many customers hand over keys, use a smart lock or leave them with a concierge. Your cleaner confirms arrival and completion, so you always know where things stand.",
      },
      q2: {
        question: "Which cities do you serve?",
        answer:
          "We currently operate in 12 Italian cities including Rome, Milan, Florence, Naples and Venice — and we expand every quarter. Enter your address at booking to confirm coverage.",
      },
      q3: {
        question: "Does my cleaner bring supplies and equipment?",
        answer:
          "Yes — by default your cleaner arrives with professional products and equipment at no extra cost. Prefer your own eco-friendly or specific products? Just leave a note in your booking.",
      },
      q4: {
        question: "How does pricing work?",
        answer:
          "Pricing is hourly and depends on the size of your place and the service you choose. You see the exact price before you confirm — no contracts, no hidden fees, and regular plans save 20%.",
      },
      q5: {
        question: "How can I pay?",
        answer:
          "You pay securely online by card when you book — all major cards are accepted through Stripe. If you cancel in time, the payment is refunded in full automatically.",
      },
      q6: {
        question: "What is your cancellation policy?",
        answer:
          "Cancel free of charge up to 24 hours before your appointment. Inside 24 hours a 50% fee applies, since your cleaner has reserved that time for you.",
      },
      q7: {
        question: "What if I'm not happy with my clean?",
        answer:
          "Every visit is covered by our Spotless Guarantee: tell us within 48 hours and we'll send a cleaner back to make it right for free — or refund the visit.",
      },
      q8: {
        question: "Are your cleaners vetted and insured?",
        answer:
          "Yes. Every professional is identity-verified, background-checked, trained on our 50-point standard, and covered by liability insurance on every single visit.",
      },
      q9: {
        question: "Can I have the same cleaner every time?",
        answer:
          "Yes — with a regular weekly or bi-weekly plan you keep the same trusted cleaner, who learns exactly how you like your home. If they're ever unavailable, we propose a vetted stand-in you can accept or decline.",
      },
    },
  },

  // ----- Per-page (heroes + section headings) -----
  pages: {
    services: {
      heroEyebrow: "Our services",
      heroTitle: "Professional cleaning for every space and situation",
      heroSubtitle:
        "One-off, regular, deep, office or end-of-lease — book exactly the clean you need, delivered by vetted professionals.",
      emptyTitle: "Services coming soon",
      emptyDescription:
        "We're putting the finishing touches on our service lineup. Get in touch and we'll tailor a plan for you.",
      emptyAction: "Contact us",
      processEyebrow: "The process",
      processTitle: "Effortless from the first booking",
      processSubtitle:
        "Whichever service you choose, the experience is the same: simple, reliable, guaranteed.",
      includedEyebrow: "Always included",
      includedTitle: "Every visit, guaranteed",
      includedSubtitle: "No matter which service you book, these come standard.",
      included: [
        "Vetted, background-checked professionals",
        "Professional supplies & equipment included",
        "Our 50-point quality checklist",
        "Full liability insurance on every visit",
        "Secure online payment & receipts",
        "Spotless Guarantee — or we re-clean free",
      ],
      ctaTitle: "Not sure which clean you need?",
      ctaSubtitle:
        "Tell us about your place and we'll recommend the right service and duration.",
    },
    pricing: {
      heroEyebrow: "Pricing",
      heroTitle: "Simple pricing that scales with you",
      heroSubtitle:
        "Pay per visit or save with a regular plan. No contracts, no setup fees, no surprises.",
      disclaimer:
        "Prices shown are starting points and vary by property size. You'll see an exact quote before you confirm any booking.",
      addonsEyebrow: "Add-ons",
      addonsTitle: "Tailor any clean with extras",
      addonsSubtitle: "Layer on exactly what your place needs, when it needs it.",
      faqEyebrow: "Pricing FAQ",
      faqTitle: "Good to know",
      ctaTitle: "Start with a single clean",
      ctaSubtitle:
        "No plan required. Book one visit, see the difference, then decide.",
    },
    about: {
      heroEyebrow: "Our story",
      heroTitle: "We started CasaClean to make great cleaning simple to book",
      heroSubtitle:
        "What began with three cleaners and a borrowed van is now a vetted team keeping thousands of homes and workplaces spotless across Italy.",
      missionLabel: "Our mission",
      mission:
        "To give people their time back — by making professional, trustworthy cleaning as easy to book as a taxi, for every home and workplace.",
      valuesEyebrow: "What we value",
      valuesTitle: "The principles behind every visit",
      milestonesEyebrow: "Milestones",
      milestonesTitle: "How we got here",
      teamEyebrow: "Leadership",
      teamTitle: "The people behind CasaClean",
      ctaTitle: "Join thousands of customers who trust CasaClean",
      ctaSubtitle: "Experience a clean you can count on — at home and at work.",
    },
    contact: {
      heroEyebrow: "Contact",
      heroTitle: "Let's get your place spotless",
      heroSubtitle:
        "Questions about coverage, pricing or cleaning for your office? We're here to help, 7 days a week.",
      emailLabel: "Email us",
      emailNote: "We reply within one business day",
      phoneLabel: "Call us",
      phoneNote: "Mon–Sat, 9:00–18:00 CET",
      visitLabel: "Visit",
      visitNote: "By appointment",
      pmTitle: "Office or multiple properties?",
      pmNote: "Ask about business plans, monthly invoicing and volume pricing.",
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
        messagePlaceholder: "Tell us about your place and what you need…",
        topicPlaceholder: "Select a topic",
      },
      topics: {
        general: "General enquiry",
        booking: "Booking a cleaning",
        pricing: "Pricing & plans",
        partnership: "Offices / business cleaning",
        support: "Existing customer support",
      },
    },
    faq: {
      heroEyebrow: "Help center",
      heroTitle: "Frequently asked questions",
      heroSubtitle:
        "Everything you need to know about booking with CasaClean. Still stuck? Reach out anytime.",
      ctaEyebrow: "Still have questions?",
      ctaTitle: "We're a message away",
      ctaSubtitle:
        "Our team responds within one business day — usually much sooner.",
    },
    careers: {
      heroEyebrow: "Careers",
      heroTitle: "Do work you're proud of — and get valued for it",
      heroSubtitle:
        "We believe cleaning is skilled work that deserves fair pay, real training and respect. Come build the most trusted cleaning company in Italy.",
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
      heroTitle: "Practical guides for a cleaner home and office",
      heroSubtitle:
        "Checklists, room-by-room guides and honest advice from professional cleaners.",
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
      ctaTitle: "Stop reading about spotless homes. Book one.",
      ctaSubtitle: "See the CasaClean standard in your own space.",
    },
    notFound: {
      code: "404",
      title: "This page has been swept away",
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
      name: "One-Time Clean",
      description: "Perfect for a one-off refresh, a special occasion or a trial run.",
      cadence: "Billed per visit",
      cta: "Book a cleaning",
      features: [
        "Standard home cleaning",
        "Professional supplies included",
        "Vetted, insured professional",
        "Secure online payment",
        "Spotless Guarantee",
      ],
    },
    host: {
      name: "Regular Clean",
      description: "For homes cleaned weekly or every two weeks — our most popular plan.",
      cadence: "Billed monthly · save 20%",
      badge: "Most popular",
      cta: "Start a regular plan",
      features: [
        "Everything in One-Time Clean",
        "The same trusted cleaner each visit",
        "Priority & same-day scheduling",
        "Skip or reschedule anytime",
        "Laundry & ironing add-on discount",
        "Dedicated support line",
      ],
    },
    portfolio: {
      name: "Business & Offices",
      description: "Tailored cleaning for offices, studios, shops and landlords.",
      cadence: "Tailored to your spaces",
      unit: "Custom",
      cta: "Talk to sales",
      features: [
        "Everything in Regular Clean",
        "Out-of-hours scheduling",
        "One monthly invoice",
        "Dedicated account manager",
        "Multiple locations, one contact",
        "Custom SLAs & reporting",
      ],
    },
  },

  pricingAddons: {
    deep: { label: "Deep clean", note: "Intensive top-to-bottom reset" },
    linen: { label: "Laundry & ironing", note: "Washed, ironed and folded" },
    restock: { label: "Inside fridge & oven", note: "Degreased and descaled, inside and out" },
    staging: { label: "Interior windows", note: "Glass, frames and sills" },
  },

  // ----- Company (values, milestones, leadership) -----
  values: {
    hospitality: {
      title: "Care in every corner",
      description:
        "We clean every home as if the owner were watching — because trust is earned in the details.",
    },
    accountability: {
      title: "Radical accountability",
      description:
        "Clear checklists and honest feedback loops. If we miss something, we own it and make it right, fast.",
    },
    craft: {
      title: "Pride in the craft",
      description:
        "Cleaning is a skill. We train, certify and reward the professionals who do it brilliantly.",
    },
    scale: {
      title: "Built to grow with you",
      description:
        "From a studio apartment to a chain of offices, our team and tooling scale without dropping a visit.",
    },
  },

  milestones: {
    m1: { title: "Founded in Rome", description: "Started with three cleaners and one promise: cleaning people can rely on." },
    m2: { title: "1,000th booking", description: "Word of mouth carried us to Florence and Milan within the first year." },
    m3: { title: "The Spotless Guarantee", description: "Launched our 50-point standard and re-clean-for-free guarantee." },
    m4: { title: "12 cities, 48k+ cleans", description: "Became the go-to cleaning partner for homes and offices alike." },
  },

  leadership: {
    founder: { role: "Co-founder & CEO", bio: "Former hotel housekeeping director who led cleaning teams across 200+ rooms and suites." },
    ops: { role: "Co-founder & COO", bio: "Built and ran multi-city field operations for an on-demand logistics company." },
    product: { role: "Head of Product", bio: "Product leader focused on tools that make booking and managing a clean feel effortless." },
    quality: { role: "Head of Quality", bio: "Defined the 50-point standard that every CasaClean visit is measured against." },
  },

  // ----- Careers (perks + roles) -----
  perks: {
    p1: { title: "Above-market pay", description: "Competitive base, performance bonuses and paid travel time." },
    p2: { title: "Flexible scheduling", description: "Choose shifts that fit your life — full-time or part-time." },
    p3: { title: "Paid training", description: "Get certified on our 50-point cleaning standard, fully paid." },
    p4: { title: "Health & insurance", description: "Coverage and full liability insurance on every visit." },
    p5: { title: "Real growth paths", description: "Team lead, trainer and regional ops roles, promoted from within." },
    p6: { title: "A team that has your back", description: "Supportive colleagues and responsive ops support, always." },
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
    title: "Book your cleaning",
    subtitle:
      "A spotless place in a few quick steps. Pay securely to confirm — your card is charged when you book, and fully refunded if you cancel.",
    continue: "Continue",
    back: "Back",
    confirm: "Confirm booking",
    steps: {
      property: { title: "Property details", subtitle: "Where are we cleaning?" },
      preferences: { title: "Cleaning preferences", subtitle: "Tailor your clean" },
      schedule: { title: "Schedule", subtitle: "Pick a date and time" },
      contact: { title: "Your details", subtitle: "Where to reach you" },
      review: { title: "Review", subtitle: "Confirm everything looks right" },
      payment: { title: "Payment", subtitle: "Secure checkout to confirm your booking" },
    },
    schedule: {
      repeat: {
        label: "Frequency",
        oneTime: "One-time",
        everyDays: "Every {days} days",
        hint: "We'll charge your saved card 1 day before each visit.",
      },
    },
    payment: {
      heading: "Pay to confirm your booking",
      newCard: "Pay with a new card",
      savedCards: "Your saved cards",
      saveCard: "Save this card for faster future bookings",
      pay: "Pay {amount}",
      processing: "Processing payment…",
      securedByStripe: "Payments are secured by Stripe. Your card is charged now and fully refunded if you cancel.",
      unavailable: "Online payments are currently unavailable. Please try again later.",
      error: "We couldn't complete your payment. Please check your card details and try again.",
      continueToPayment: "Continue to secure payment",
      recurring: {
        summary: "{amount} every {days} days. Next charge on {date}.",
        saveRequired: "A saved card is required for recurring visits.",
        nextCharge: "Next charge on {date}",
      },
    },
    quote: {
      title: "Your quote",
      subtitle: "Updates as you build your booking.",
      empty: "Select a service to see your estimate.",
      total: "Estimated total",
      guarantee:
        "Backed by the Spotless Guarantee. Free cancellation up to 24h before.",
    },
    confirmation: {
      title: "Booking confirmed!",
      body:
        "your cleaning is booked. We've emailed your confirmation and we'll be in touch with your cleaner's arrival window.",
      reference: "Booking reference",
      total: "total",
      home: "Back to home",
      profile: "Go to my profile",
      more: "Explore more services",
    },
  },

  // ----- Admin panel -----
  admin: {
    manage: "Manage",
    backToSite: "Back to site",
    login: {
      badge: "Restricted area",
      title: "Admin Console",
      subtitle: "Sign in with your administrator account to continue.",
      email: "Email",
      emailPlaceholder: "you@casaclean.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Sign in to admin",
      notAdmin: "This account doesn't have admin access.",
      backToSite: "Back to site",
    },
    topbar: {
      console: "Admin console",
      administrator: "Administrator",
      signOut: "Sign out",
      openNav: "Open navigation",
      adminFallback: "Admin",
      viewLive: "View live website",
    },
    table: {
      actions: "Actions",
      search: "Search…",
      noMatches: "No matches",
      tryDifferent: "Try a different search term.",
      result: "result",
      results: "results",
      empty: "Nothing here yet",
    },
    action: {
      edit: "Edit",
      view: "View",
      delete: "Delete",
    },
    form: {
      cancel: "Cancel",
      create: "Create",
      saveChanges: "Save changes",
      noOptions: "No options available yet.",
      selectOption: "Select an option…",
      required: "{label} is required",
      translationsFallback: "Translations fall back to English when left blank.",
      deleteConfirm: 'Delete "{name}"? This can\'t be undone.',
      imageUpload: "Upload image",
      imageReplace: "Replace",
      imageRemove: "Remove image",
      imageProcessing: "Processing…",
      listAdd: "Add item",
      listRemove: "Remove",
    },
    confirm: {
      title: "Are you sure?",
      confirm: "Confirm",
      cancel: "Cancel",
      body: "This action can't be undone.",
    },
    status: {
      pending: "Pending",
      confirmed: "Confirmed",
      in_progress: "In progress",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    payment: {
      paid: "Paid",
      refunded: "Refunded",
      manual: "Manual / cash",
      unpaid: "Unpaid",
    },
    dashboard: {
      welcome: "Welcome back, {name}",
      subtitle: "Here's what's happening across CasaClean today.",
      bookings: "Bookings",
      pendingHint: "{count} pending",
      revenue: "Revenue",
      revenueHint: "Confirmed + completed",
      services: "Services",
      servicesHint: "{count} active",
      cities: "Cities",
      citiesHint: "{count} active",
      pipeline: "Booking pipeline",
      pipelineSub: "By current status",
      recent: "Recent bookings",
    },
    bookings: {
      title: "Bookings",
      description: "Track and manage every booking from request to completion.",
      add: "Add booking",
      search: "Search bookings…",
      emptyTitle: "No bookings",
      emptyDescription: "Bookings from the site will appear here.",
      allStatuses: "All statuses",
      dateFrom: "From date",
      dateTo: "To date",
      noAccount: "— No linked account —",
      addTitle: "Add booking",
      editTitle: "Edit booking",
      deleteTitle: "Delete booking",
      detailsTitle: "Booking details",
      col: {
        customer: "Customer",
        serviceCity: "Service / City",
        schedule: "Schedule",
        total: "Total",
        payment: "Payment",
        status: "Status",
      },
      detail: {
        customer: "Customer",
        email: "Email",
        phone: "Phone",
        service: "Service",
        city: "City",
        address: "Address",
        dateTime: "Date & time",
        hoursCleaners: "Hours / cleaners",
        propertySize: "Property size",
        workers: "Assigned workers",
        notes: "Notes",
      },
      field: {
        linkAccount: "Link to account (optional)",
        customerName: "Customer name",
        email: "Email",
        phone: "Phone",
        service: "Service",
        city: "City",
        serviceId: "Service ID",
        serviceIdHint: "Numeric service reference (catalogue id).",
        cityId: "City ID",
        date: "Date",
        time: "Time",
        street: "Street",
        houseNo: "House no.",
        doorbell: "Doorbell name",
        hours: "Hours",
        cleaners: "Cleaners",
        total: "Total (€)",
        status: "Status",
        workers: "Assigned workers",
        workersHint: "Cleaning staff assigned to this booking.",
        notes: "Notes",
      },
    },
    services: {
      title: "Services",
      description:
        "Manage the cleaning services, pricing and translations shown across the site.",
      add: "Add service",
      search: "Search services…",
      emptyTitle: "No services yet",
      emptyDescription: "Add your first service to get started.",
      addTitle: "Add service",
      editTitle: "Edit service",
      deleteTitle: "Delete service",
      popular: "Popular",
      allCitiesBadge: "All cities",
      col: {
        service: "Service",
        pricePerHr: "Price / hr",
        cities: "Coverage",
        popular: "Popular",
        status: "Status",
      },
      field: {
        name: "Name",
        image: "Service image",
        imageHint: "Shown on the service card. A wide (16:10) photo works best.",
        subtitle: "Sub-title",
        subtitleHint: "A short tagline shown under the name.",
        subtitlePlaceholder: "e.g. Your regular clean, made effortless",
        includes: "What's included",
        includesHint: "Bullet points listing what this service covers.",
        includesPlaceholder: "e.g. Full kitchen & bathroom sanitation",
        includesAdd: "Add inclusion",
        pricePerHour: "Price per hour (€)",
        description: "Description",
        allCities: "Available in all cities",
        allCitiesHint: "When on, this service is offered everywhere and the city list below is ignored.",
        cities: "Available in cities",
        citiesHint: "Select the cities where this service is offered.",
        allSpecialRequests: "Enable all special requests",
        allSpecialRequestsHint: "When on, every special request add-on is available for this service and the list below is ignored.",
        specialRequests: "Special requests enabled for this service",
        specialRequestsHint: "Select which add-ons customers can attach when booking this service.",
        enabled: "Enabled (visible on site)",
      },
    },
    specialRequests: {
      title: "Special requests",
      description: "Manage the booking add-ons customers can attach to a booking.",
      add: "Add special request",
      search: "Search special requests…",
      emptyTitle: "No special requests yet",
      emptyDescription: "Add your first add-on so customers can select it at checkout.",
      addTitle: "Add special request",
      editTitle: "Edit special request",
      deleteTitle: "Delete special request",
      col: {
        name: "Add-on",
        price: "Price",
        status: "Status",
      },
      field: {
        name: "Name",
        price: "Surcharge (€)",
        description: "Description",
        enabled: "Available for booking",
      },
    },
    cleaningTools: {
      title: "Cleaning tools",
      description: "Manage the tools and supplies (mop, vacuum, …) that can be added to a booking.",
      add: "Add cleaning tool",
      search: "Search cleaning tools…",
      emptyTitle: "No cleaning tools yet",
      emptyDescription: "Add your first tool so it can be offered with bookings.",
      addTitle: "Add cleaning tool",
      editTitle: "Edit cleaning tool",
      deleteTitle: "Delete cleaning tool",
      allServices: "All services",
      col: {
        name: "Tool",
        services: "Services",
        price: "Extra price",
        status: "Status",
      },
      field: {
        name: "Name",
        price: "Extra price (€)",
        description: "Description",
        services: "Usable on services",
        servicesHint: "Select the services this tool can be used on. Leave empty to allow it on every service.",
        enabled: "Available for booking",
      },
    },
    cities: {
      title: "Cities",
      description: "Control where CasaClean operates and the hours bookings are accepted.",
      add: "Add city",
      search: "Search cities…",
      emptyTitle: "No cities yet",
      emptyDescription: "Add a city to open it for bookings.",
      addTitle: "Add city",
      editTitle: "Edit city",
      deleteTitle: "Delete city",
      col: {
        city: "City",
        workingDays: "Working days",
        hours: "Hours",
        status: "Status",
      },
      field: {
        name: "Name (English)",
        nameIt: "Name (Italian)",
        nameKa: "Name (Georgian)",
        workingDays: "Working days",
        workingDaysHint: "Comma-separated, 1 = Monday … 7 = Sunday",
        opensAt: "Opens at",
        closesAt: "Closes at",
        enabled: "Available for booking",
      },
      days: { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" },
    },
    users: {
      title: "Users",
      description: "Manage accounts, roles and verification status.",
      add: "Add user",
      search: "Search users…",
      emptyTitle: "No users",
      emptyDescription: "Add a user account to manage it here.",
      addTitle: "Add user",
      editTitle: "Edit user",
      deleteTitle: "Delete user",
      role: { user: "User", admin: "Admin" },
      col: {
        user: "User",
        phone: "Phone",
        role: "Role",
        verified: "Verified",
        joined: "Joined",
      },
      field: {
        fullname: "Full name",
        email: "Email",
        phone: "Phone",
        password: "Password",
        passwordEditHint: "Leave blank to keep the current password.",
        role: "Role",
        verified: "Email verified",
      },
    },
    workers: {
      title: "Workers",
      description: "Manage the cleaning staff you can assign to bookings.",
      add: "Add worker",
      search: "Search workers…",
      emptyTitle: "No workers yet",
      emptyDescription: "Add a worker so you can assign them to bookings.",
      addTitle: "Add worker",
      editTitle: "Edit worker",
      deleteTitle: "Delete worker",
      col: {
        worker: "Worker",
        contact: "Contact",
        status: "Status",
      },
      field: {
        fullname: "Full name",
        email: "Email (optional)",
        phone: "Phone (optional)",
        enabled: "Available for assignment",
      },
    },
    quality: {
      title: "Quality & reviews",
      description:
        "Customer review scores and comments. Reviews can only be left by customers after a completed booking.",
      search: "Search reviews…",
      emptyTitle: "No reviews yet",
      emptyDescription:
        "Reviews appear here once customers rate their completed bookings.",
      deleteTitle: "Delete review",
      deleteConfirm: "Delete this review from {name}? This can't be undone.",
      distribution: "Rating distribution",
      distributionSub: "How scores break down",
      stat: {
        avg: "Average rating",
        avgHint: "Across {count} reviews",
        total: "Total reviews",
        totalHint: "All time",
        positive: "Positive (4–5★)",
        positiveHint: "{count} of {total}",
      },
      col: {
        customer: "Customer",
        service: "Service",
        booking: "Booking",
        rating: "Rating",
        comment: "Comment",
        date: "Date",
      },
      detail: {
        title: "Review detail",
        booking: "Rated booking",
        date: "Date & time",
        location: "Location",
        property: "Property size",
        duration: "Duration",
        durationValue: "{hours} h · {cleaners} cleaner(s)",
        total: "Total",
      },
    },
    subscriptions: {
      title: "Subscriptions",
      description: "Monitor recurring cleanings, scheduled charges, and payment failures.",
      search: "Search subscriptions…",
      emptyTitle: "No subscriptions",
      emptyDescription: "Recurring bookings will appear here.",
      error: "We couldn't load or update subscriptions. Please try again.",
      allStatuses: "All statuses",
      everyDays: "Every {days} days",
      chargeSucceeded: "Paid",
      chargeFailed: "Failed",
      retryCount: "{count} failed attempt(s)",
      pause: "Pause",
      resume: "Resume",
      cancel: "Cancel",
      cancelTitle: "Cancel this subscription?",
      cancelBody: "This stops future {service} visits. Paid bookings are not changed.",
      cancelConfirm: "Cancel subscription",
      detailTitle: "Subscription details",
      cycleBookings: "Paid cycle bookings",
      noCycleBookings: "No paid recurring visits yet.",
      failedAttempts: "Failed charge attempts",
      noFailedAttempts: "No failed attempts recorded.",
      col: {
        customer: "Customer",
        service: "Service / City",
        interval: "Interval",
        nextCharge: "Next charge / service",
        lastCharge: "Last charge",
        status: "Status / flags",
      },
      detail: {
        customer: "Customer",
        email: "Email",
        service: "Service",
        city: "City",
        interval: "Interval",
        nextService: "Next service",
        nextCharge: "Next charge",
        lastError: "Last error",
      },
      status: {
        active: "Active",
        paused: "Paused",
        cancelled: "Cancelled",
      },
      reason: {
        "payment-failed": "Payment failed",
        "card-removed": "Card removed",
        "service-unavailable": "Service unavailable",
        "user-request": "Paused by customer",
      },
    },
    nav: {
      dashboard: "Dashboard",
      bookings: "Bookings",
      subscriptions: "Subscriptions",
      calendar: "Calendar",
      services: "Services",
      specialRequests: "Special requests",
      cleaningTools: "Cleaning tools",
      cities: "Cities",
      coverage: "Bookings map",
      workers: "Workers",
      quality: "Quality",
      users: "Users",
    },
    calendar: {
      title: "Calendar",
      description:
        "Every booking placed on its scheduled date. Click an entry to open the booking details.",
      today: "Today",
      prevMonth: "Previous month",
      nextMonth: "Next month",
      monthCount: "{count} booking(s) this month",
      more: "+{count} more",
      dayCount: "{count} booking(s)",
    },
    coverage: {
      title: "Bookings map",
      description:
        "Every booking plotted at its exact address. Click a marker to open the booking card.",
      statBookings: "Bookings on the map",
      statCities: "Cities",
      statRevenue: "Booked value",
      listTitle: "Booking locations",
      empty:
        "No bookings yet. New bookings appear here at their exact address.",
      locating: "Locating addresses…",
      approx: "approximate location",
      noKeyTitle: "Map needs a Google Maps API key",
      noKeyBody:
        "Set VITE_GOOGLE_MAPS_API_KEY in the client environment to enable the interactive map. The city breakdown below still works without it.",
      errorTitle: "Map failed to load",
      errorBody:
        "The Google Maps script couldn't be loaded. Check the API key and your connection, then refresh.",
    },
  },
};
