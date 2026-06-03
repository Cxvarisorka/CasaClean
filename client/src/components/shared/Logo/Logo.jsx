import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/metadata";

/*
 * Logo
 * ----
 * The brand mark: a custom inline SVG (no asset request) plus the wordmark.
 * `tone` flips it for dark surfaces like the footer. Links home unless `as`
 * is overridden (e.g. a plain mark in the footer).
 */

function Mark({ className }) {
  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-soft",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        {/* A stylized house + sparkle — clean home, premium service. */}
        <path
          d="M4 11.5 12 5l8 6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 10.5V18a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12.2l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Logo({ tone = "light", withWordmark = true, className }) {
  return (
    <Link
      to={ROUTES.home}
      aria-label={`${SITE.name} — home`}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Mark />
      {withWordmark && (
        <span
          className={cn(
            "font-display text-xl font-bold tracking-tight",
            tone === "dark" ? "text-white" : "text-ink-900"
          )}
        >
          {SITE.name}
        </span>
      )}
    </Link>
  );
}

export default Logo;
