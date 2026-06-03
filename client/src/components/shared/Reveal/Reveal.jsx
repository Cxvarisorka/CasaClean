import { motion } from "framer-motion";
import { fadeInUp } from "@/animations/fade";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * Reveal
 * ------
 * The workhorse scroll-reveal wrapper. Animates children into view once, with
 * a configurable distance/delay. Built on whileInView so it composes with the
 * global reduced-motion handling and never blocks SSR/first paint.
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

  return (
    <MotionTag
      className={className}
      variants={fadeInUp(distance, duration, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={amount ? { ...viewportOnce, amount } : viewportOnce}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;
