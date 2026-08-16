import { useMemo } from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/animations/fade";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * Reveal
 * ------
 * The workhorse scroll-reveal wrapper. Animates children into view once, with
 * a configurable distance/delay. Built on whileInView so it composes with the
 * global reduced-motion handling and never blocks SSR/first paint.
 *
 * It wraps most sections of most marketing pages, so the per-render work here
 * is multiplied across the page: both the variants object and the viewport
 * config are memoized. As fresh objects each render they made Framer
 * re-evaluate the animation config on every parent render.
 */

export function Reveal({
  as = "div",
  distance = 24,
  duration = 0.6,
  delay = 0,
  amount,
  className,
  children,
  ...props
}) {
  const MotionTag = motion[as] || motion.div;

  const variants = useMemo(
    () => fadeInUp(distance, duration, delay),
    [distance, duration, delay]
  );

  const viewport = useMemo(
    () => (amount ? { ...viewportOnce, amount } : viewportOnce),
    [amount]
  );

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;
