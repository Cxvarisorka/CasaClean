/*
 * Motion tokens
 * -------------
 * Shared easing curves and durations so every animation across the product
 * resolves to the same physical feel. These mirror the CSS easing tokens in
 * globals.css (`--ease-premium`, `--ease-spring`).
 */

// cubic-bezier(0.22, 1, 0.36, 1) — a confident, decelerating ease-out.
export const EASE_PREMIUM = [0.22, 1, 0.36, 1];

// cubic-bezier(0.34, 1.56, 0.64, 1) — a gentle overshoot for playful accents.
export const EASE_SPRING = [0.34, 1.56, 0.64, 1];

export const DURATION = {
  fast: 0.25,
  base: 0.45,
  slow: 0.7,
};

// A reusable spring config for interactive elements (hover/press).
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 24 };
export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 30 };
