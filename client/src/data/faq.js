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
        question: "Do I need to be home during the cleaning?",
        answer:
          "It's completely up to you. Many customers hand over keys, use a smart lock or leave them with a concierge. Your cleaner confirms arrival and completion, so you always know where things stand.",
      },
      {
        id: "q2",
        question: "Which cities do you serve?",
        answer:
          "We currently operate in 12 Italian cities including Rome, Milan, Florence, Naples and Venice — and we expand every quarter. Enter your address at booking to confirm coverage.",
      },
      {
        id: "q3",
        question: "Does my cleaner bring supplies and equipment?",
        answer:
          "Yes — by default your cleaner arrives with professional products and equipment at no extra cost. Prefer your own eco-friendly or specific products? Just leave a note in your booking.",
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
          "Pricing is hourly and depends on the size of your place and the service you choose. You see the exact price before you confirm — no contracts, no hidden fees, and regular plans save 20%.",
      },
      {
        id: "q5",
        question: "How can I pay?",
        answer:
          "You pay securely online by card when you book — all major cards are accepted through Stripe. If you cancel in time, the payment is refunded in full automatically.",
      },
      {
        id: "q6",
        question: "What is your cancellation policy?",
        answer:
          "Cancel free of charge up to 24 hours before your appointment. Inside 24 hours a 50% fee applies, since your cleaner has reserved that time for you.",
      },
    ],
  },
  {
    id: "quality-trust",
    label: "Quality & trust",
    items: [
      {
        id: "q7",
        question: "What if I'm not happy with my clean?",
        answer:
          "Every visit is covered by our Spotless Guarantee: tell us within 48 hours and we'll send a cleaner back to make it right for free — or refund the visit.",
      },
      {
        id: "q8",
        question: "Are your cleaners vetted and insured?",
        answer:
          "Yes. Every professional is identity-verified, background-checked, trained on our 50-point standard, and covered by liability insurance on every single visit.",
      },
      {
        id: "q9",
        question: "Can I have the same cleaner every time?",
        answer:
          "Yes — with a regular weekly or bi-weekly plan you keep the same trusted cleaner, who learns exactly how you like your home. If they're ever unavailable, we propose a vetted stand-in you can accept or decline.",
      },
    ],
  },
];

/** Flattened list, handy for schema and the home preview. */
export const ALL_FAQS = FAQ_CATEGORIES.flatMap((c) => c.items);
