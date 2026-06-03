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
    "bg-ink-900 text-white shadow-soft hover:bg-ink-800 hover:shadow-medium",
  outline:
    "border border-ink-200 bg-white text-ink-900 hover:border-brand-300 hover:bg-brand-50",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  accent:
    "bg-accent-500 text-ink-950 shadow-soft hover:bg-accent-400 hover:shadow-medium",
  link: "text-brand-600 underline-offset-4 hover:underline px-0",
};

const SIZES = {
  sm: "h-9 px-4 text-body-sm gap-1.5",
  md: "h-11 px-5 text-body-sm gap-2",
  lg: "h-13 px-7 text-body-md gap-2.5",
  xl: "h-15 px-9 text-body-md gap-3",
  icon: "h-11 w-11",
};

const BASE =
  "inline-flex items-center justify-center rounded-full font-semibold tracking-tight " +
  "transition-[background-color,box-shadow,color,border-color] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
  "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 " +
  "select-none whitespace-nowrap";

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
    fullWidth && "w-full",
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
