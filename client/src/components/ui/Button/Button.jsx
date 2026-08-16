import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Button
 * ------
 * The product's primary action primitive. A single component covers buttons,
 * router links and external anchors via the `as`/`to`/`href` props, so callers
 * never reach for a raw element. Variants and sizes are declared as lookup maps
 * (open/closed principle) — add a variant without touching render logic.
 */

const VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-soft hover:bg-brand-700 hover:shadow-medium",
  secondary:
    "bg-night text-white shadow-soft hover:bg-night-soft hover:shadow-medium",
  outline:
    "border border-ink-200 bg-surface text-ink-900 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-night-soft",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  accent:
    "bg-accent-500 text-night-soft shadow-soft hover:bg-accent-400 hover:shadow-medium",
  link: "text-brand-600 underline-offset-4 hover:underline px-0",
};

/*
 * Heights are minimums, not fixed values. A button is `whitespace-nowrap` from
 * `xs` up (see BASE) because a pill that breaks mid-label looks broken — but
 * below 400px there are places where the label is simply wider than the column
 * it sits in (a 200px viewport leaves a card ~140px of content, and "Change
 * password" wants 150), and a nowrap label there doesn't shrink, it escapes the
 * card and scrolls the page sideways. So the label may wrap on the smallest
 * screens, and the box grows to hold it.
 *
 * The vertical padding is set so a single line still measures exactly the old
 * fixed height — `min-h` wins for one line at every width — which is why this
 * changes nothing above 400px, or below it for any label that fits.
 */
const SIZES = {
  sm: "min-h-9 px-4 py-1.5 text-body-sm gap-1.5",
  md: "min-h-11 px-5 py-2 text-body-sm gap-2",
  lg: "min-h-13 px-7 py-2.5 text-body-md gap-2.5",
  xl: "min-h-15 px-9 py-3 text-body-md gap-3",
  // No label to wrap, so this one keeps a fixed square.
  icon: "h-11 w-11 shrink-0",
};

const BASE =
  "inline-flex items-center justify-center rounded-full font-semibold tracking-tight " +
  "transition-[background-color,box-shadow,color,border-color] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
  "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 " +
  "select-none max-w-full text-center whitespace-normal xs:whitespace-nowrap";

export const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    children,
    ...props
  },
  ref
) {
  const classes = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    // A full-width button can never grow sideways, so its label wraps at every
    // width — the sizes above already carry the matching min-height.
    fullWidth && "w-full whitespace-normal",
    className
  );

  const content = (
    <>
      {loading ? (
        <Loader2 className="size-[1.1em] animate-spin" aria-hidden="true" />
      ) : (
        LeftIcon && <LeftIcon className="size-[1.15em]" aria-hidden="true" />
      )}
      {children}
      {!loading && RightIcon && (
        <RightIcon className="size-[1.15em]" aria-hidden="true" />
      )}
    </>
  );

  // Subtle, premium press feedback — disabled when the control is inert.
  const motionProps =
    disabled || loading
      ? {}
      : { whileHover: { y: -1 }, whileTap: { scale: 0.97 } };

  // Internal navigation -> router Link; external -> anchor; otherwise <button>.
  if (to) {
    const MotionLink = motion(Link);
    return (
      <MotionLink ref={ref} to={to} className={classes} {...motionProps} {...props}>
        {content}
      </MotionLink>
    );
  }

  if (href) {
    return (
      <motion.a
        ref={ref}
        href={href}
        className={classes}
        rel="noopener noreferrer"
        {...motionProps}
        {...props}
      >
        {content}
      </motion.a>
    );
  }

  const Component = motion[as || "button"];
  return (
    <Component
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...motionProps}
      {...props}
    >
      {content}
    </Component>
  );
});

export default Button;
