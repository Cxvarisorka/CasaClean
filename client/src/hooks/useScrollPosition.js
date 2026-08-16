import { useEffect, useState } from "react";

/**
 * Tracks scroll direction and whether the page has left the top, with a
 * rAF-throttled listener, so consumers (e.g. the sticky navbar) can react
 * without layout thrash.
 *
 * Deliberately does NOT expose the raw offset. It used to, and because the
 * offset differs on every frame the state object was always new — so the whole
 * consuming subtree (the Navbar: logo, links, language switcher, theme toggle,
 * buttons, mobile menu) re-rendered once per animation frame for the entire
 * length of every scroll, on every marketing page. Only the two derived,
 * low-cardinality values are published, and an unchanged frame returns the
 * previous object so React bails out of the update entirely.
 *
 * @param {number} [threshold=8] - min delta to register a direction change
 * @returns {{ direction: "up" | "down", scrolled: boolean }}
 */
export function useScrollPosition(threshold = 8) {
  const [state, setState] = useState({ direction: "up", scrolled: false });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      setState((prev) => {
        const direction =
          Math.abs(delta) < threshold ? prev.direction : delta > 0 ? "down" : "up";
        const scrolled = y > 12;

        // Same identity when nothing observable changed — React skips the
        // re-render instead of reconciling an equal tree every frame.
        return direction === prev.direction && scrolled === prev.scrolled
          ? prev
          : { direction, scrolled };
      });

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
