import { useEffect, useRef, useState } from "react";

/**
 * Observes an element's intersection with the viewport.
 * Returns a ref to attach and whether it is (or has been) in view.
 *
 * @param {object} [options]
 * @param {number} [options.threshold=0.2]
 * @param {string} [options.rootMargin="0px"]
 * @param {boolean} [options.once=true] - stop observing after first intersection
 * @returns {[React.RefObject, boolean]}
 */
export function useIntersection({
  threshold = 0.2,
  rootMargin = "0px",
  once = true,
} = {}) {
  const ref = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsIntersecting(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isIntersecting];
}
