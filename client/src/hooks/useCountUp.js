import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./useMediaQuery";

/**
 * Animates a number from 0 to `end` once `active` becomes true.
 * Uses requestAnimationFrame with an ease-out curve for a premium count.
 *
 * @param {number} end - target value
 * @param {object} [options]
 * @param {boolean} [options.active=true] - gate the animation (e.g. on scroll-in)
 * @param {number} [options.duration=1800]
 * @param {number} [options.decimals=0]
 * @returns {number}
 */
export function useCountUp(end, { active = true, duration = 1800, decimals = 0 } = {}) {
  const reduceMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      // Honor reduced-motion: snap to the final value instead of animating.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(end);
      return;
    }

    let start;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      if (start === undefined) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const current = end * easeOut(progress);
      setValue(Number(current.toFixed(decimals)));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [end, active, duration, decimals, reduceMotion]);

  return value;
}
