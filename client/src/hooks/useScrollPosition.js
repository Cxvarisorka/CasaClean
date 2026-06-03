import { useEffect, useState } from "react";

/**
 * Tracks vertical scroll position and direction with a rAF-throttled listener,
 * so consumers (e.g. the sticky navbar) can react without layout thrash.
 *
 * @param {number} [threshold=8] - min delta to register a direction change
 * @returns {{ y: number, direction: "up" | "down", scrolled: boolean }}
 */
export function useScrollPosition(threshold = 8) {
  const [state, setState] = useState({ y: 0, direction: "up", scrolled: false });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      setState((prev) => {
        const direction =
          Math.abs(delta) < threshold ? prev.direction : delta > 0 ? "down" : "up";
        return { y, direction, scrolled: y > 12 };
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
