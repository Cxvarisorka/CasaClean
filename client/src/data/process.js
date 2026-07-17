/*
 * Process content
 * ---------------
 * Two related narratives: the high-level booking workflow (how working with
 * CasaClean feels) and the detailed cleaning timeline (what happens on site).
 */

export const WORKFLOW_STEPS = [
  {
    id: "book",
    icon: "CalendarCheck",
    title: "Book online in 60 seconds",
    description:
      "Choose your service, tell us about your place and pick a time. You see the exact price before you confirm.",
  },
  {
    id: "clean",
    icon: "Sparkles",
    title: "Get matched with a pro",
    description:
      "We assign a vetted, background-checked cleaner who fits your schedule — with your language and preferences in mind.",
  },
  {
    id: "inspect",
    icon: "ClipboardCheck",
    title: "We make it shine",
    description:
      "Your cleaner works through our 50-point checklist, starting with the priorities you flagged in your booking.",
  },
  {
    id: "relax",
    icon: "BadgeCheck",
    title: "Rate it — it's guaranteed",
    description:
      "Review your clean afterwards. If anything's not right, we'll re-clean within 48 hours at no charge.",
  },
];

export const CLEANING_TIMELINE = [
  {
    id: "arrival",
    time: "00:00",
    title: "Arrival & walkthrough",
    description:
      "Your cleaner arrives on time, reviews your booking notes, and confirms priorities and any no-go areas.",
  },
  {
    id: "strip",
    time: "00:15",
    title: "Tidy & dust",
    description:
      "Surfaces are decluttered and dusted top to bottom — shelves, frames, skirting boards and the forgotten corners.",
  },
  {
    id: "kitchen-bath",
    time: "00:45",
    title: "Kitchen & bathrooms",
    description:
      "The rooms that matter most: degreasing, descaling and sanitizing appliances, fixtures and high-touch surfaces.",
  },
  {
    id: "living",
    time: "01:30",
    title: "Bedrooms & living areas",
    description:
      "Beds made, mirrors polished, furniture wiped and every room reset to calm.",
  },
  {
    id: "restock",
    time: "02:15",
    title: "Floors & finishing touches",
    description:
      "Vacuuming and mopping throughout, bins emptied and everything returned to its place.",
  },
  {
    id: "inspect",
    time: "02:45",
    title: "Final check & feedback",
    description:
      "A last pass against the checklist, then you rate the visit — your feedback shapes every clean that follows.",
  },
];
