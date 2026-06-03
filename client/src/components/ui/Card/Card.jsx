import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/*
 * Card
 * ----
 * A composable surface primitive. Compound sub-components (Card.Header, .Body,
 * .Footer) keep layout declarative while the root owns elevation and the
 * optional hover-lift interaction. `interactive` opts into motion + cursor.
 */

const VARIANTS = {
  default: "bg-surface border border-ink-100 shadow-soft",
  elevated: "bg-surface border border-ink-100 shadow-medium",
  ghost: "bg-ink-50/60 border border-transparent",
  outline: "bg-surface border border-ink-200",
  brand: "bg-brand-50 border border-brand-100",
};

export function Card({
  variant = "default",
  interactive = false,
  className,
  children,
  ...props
}) {
  const classes = cn(
    "rounded-2xl",
    VARIANTS[variant],
    interactive && "transition-shadow duration-300 hover:shadow-large",
    className
  );

  if (interactive) {
    return (
      <motion.div
        className={cn(classes, "cursor-pointer")}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ className, ...props }) {
  return <div className={cn("p-6 pb-0", className)} {...props} />;
};

Card.Body = function CardBody({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
};

Card.Footer = function CardFooter({ className, ...props }) {
  return (
    <div className={cn("p-6 pt-0 mt-auto", className)} {...props} />
  );
};

export default Card;
