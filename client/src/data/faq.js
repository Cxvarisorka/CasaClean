/*
 * FAQ content
 * -----------
 * Grouped by category for the FAQ page; the Home preview shows the first few.
 * Question/answer pairs also feed FAQ schema.org structured data for SEO.
 */

export const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting started",
    items: [
      {
        id: "q1",
        question: "How quickly can you turn over my property?",
        answer:
          "Most turnovers are completed within 3–4 hours of guest checkout. With a confirmed schedule, we can have your property guest-ready the same day — even for back-to-back bookings.",
      },
      {
        id: "q2",
        question: "Which areas do you currently serve?",
        answer:
          "We operate across major Italian short-term rental markets including Rome, Florence, Milan, Naples and Venice, and we add new cities every quarter. Enter your address at booking to confirm coverage.",
      },
      {
        id: "q3",
        question: "Do I need to be present for the cleaning?",
        answer:
          "No. The vast majority of our hosts use smart locks or key handoffs. We document entry and exit with timestamped photos, so you always have a record without lifting a finger.",
      },
    ],
  },
  {
    id: "pricing-billing",
    label: "Pricing & billing",
    items: [
      {
        id: "q4",
        question: "How does pricing work?",
        answer:
          "You can pay per turnover or save with a managed monthly plan. Per-turnover pricing is based on property size and the services you select — there are no contracts and no hidden fees.",
      },
      {
        id: "q5",
        question: "Are supplies and linens included?",
        answer:
          "You choose. We can use your supplies and linens, or provide hotel-grade linens and consumables as an add-on. Restocking is tracked automatically so you never run out.",
      },
      {
        id: "q6",
        question: "Is there a cancellation fee?",
        answer:
          "Cancellations made more than 24 hours before a scheduled turnover are free. Inside 24 hours, a 50% fee applies to cover the reserved crew slot.",
      },
    ],
  },
  {
    id: "quality-trust",
    label: "Quality & trust",
    items: [
      {
        id: "q7",
        question: "What if I'm not satisfied with a clean?",
        answer:
          "Every turnover is backed by our Guest-Ready Guarantee. If something isn't right, we'll re-clean within 24 hours at no charge — or refund the visit.",
      },
      {
        id: "q8",
        question: "Are your cleaners vetted and insured?",
        answer:
          "Yes. Every professional is background-checked, trained on our 50-point standard, and fully insured. We carry liability coverage on every visit for your peace of mind.",
      },
      {
        id: "q9",
        question: "How do you handle damage or lost items?",
        answer:
          "Our inspection reports flag damage with photos the moment it's found, and lost-and-found items are logged and stored. You'll have documentation before your next guest arrives.",
      },
    ],
  },
];

/** Flattened list, handy for schema and the home preview. */
export const ALL_FAQS = FAQ_CATEGORIES.flatMap((c) => c.items);
