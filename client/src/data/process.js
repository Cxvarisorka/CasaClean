/*
 * Process content
 * ---------------
 * Two related narratives: the high-level turnover workflow (how working with
 * CasaClean feels) and the detailed cleaning timeline (what happens on site).
 */

export const WORKFLOW_STEPS = [
  {
    id: "book",
    icon: "CalendarCheck",
    title: "Book in minutes",
    description:
      "Tell us about your property and pick a time. Sync your calendar so turnovers auto-schedule after each checkout.",
  },
  {
    id: "clean",
    icon: "Sparkles",
    title: "We turn it over",
    description:
      "A vetted crew arrives on time and resets your space to our 50-point, five-star hospitality standard.",
  },
  {
    id: "inspect",
    icon: "ClipboardCheck",
    title: "Inspect & document",
    description:
      "Every visit ends with a timestamped photo report — damage flagged, supplies logged, lost items recorded.",
  },
  {
    id: "relax",
    icon: "BadgeCheck",
    title: "Guest-ready, guaranteed",
    description:
      "Your listing is staged, stocked and spotless. If anything's off, we re-clean within 24 hours — no charge.",
  },
];

export const CLEANING_TIMELINE = [
  {
    id: "arrival",
    time: "00:00",
    title: "Arrival & walkthrough",
    description:
      "Crew checks in, documents the property's condition on entry, and reviews any host notes from the last guest.",
  },
  {
    id: "strip",
    time: "00:15",
    title: "Strip & laundry",
    description:
      "Used linens and towels are removed, fresh hotel-grade sets are staged, and laundry is started or swapped.",
  },
  {
    id: "kitchen-bath",
    time: "00:45",
    title: "Kitchen & bathrooms",
    description:
      "Deep sanitation of the highest-impact rooms: appliances, fixtures, surfaces and high-touch points.",
  },
  {
    id: "living",
    time: "01:30",
    title: "Living spaces & beds",
    description:
      "Floors, dusting, bed making with a hotel fold, and a careful reset of every shared space.",
  },
  {
    id: "restock",
    time: "02:15",
    title: "Restock & stage",
    description:
      "Consumables replenished, welcome amenities staged, lighting and ambiance set for arrival.",
  },
  {
    id: "inspect",
    time: "02:45",
    title: "Inspection & report",
    description:
      "Final 50-point check, timestamped photos captured, and your guest-ready confirmation sent.",
  },
];
