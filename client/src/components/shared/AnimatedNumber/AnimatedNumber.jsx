import { useIntersection } from "@/hooks/useIntersection";
import { useCountUp } from "@/hooks/useCountUp";

/*
 * AnimatedNumber
 * --------------
 * Counts up to a target value the first time it scrolls into view. Pure
 * presentation over the useCountUp + useIntersection hooks — no logic here.
 */

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1800,
  className,
}) {
  const [ref, inView] = useIntersection({ threshold: 0.4 });
  const current = useCountUp(value, { active: inView, duration, decimals });

  const formatted = current.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;
