/**
 * Smoothly scrolls to an element by id, accounting for the sticky navbar
 * height so anchored sections are not hidden underneath it.
 *
 * @param {string} id - target element id (without the leading '#')
 * @param {number} [offset=88] - pixels to leave for the fixed header
 */
export function scrollToSection(id, offset = 88) {
  const el = document.getElementById(id);
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}
