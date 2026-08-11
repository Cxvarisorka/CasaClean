// Vitest global setup: jest-dom matchers (toBeInTheDocument, …) for every suite.
import "@testing-library/jest-dom/vitest";

/*
 * jsdom implements no IntersectionObserver, and framer-motion's `whileInView`
 * (used by every page's reveal animation) constructs one on mount. Without this
 * stub, rendering a real page in a test throws before a single assertion runs.
 *
 * The stub is deliberately inert: nothing ever intersects, so elements stay in
 * their "hidden" variant. Tests assert on the DOM, which is present either way.
 */
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
