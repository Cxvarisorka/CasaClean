import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/metadata";
import logoMark from "@/assets/logo.png";

/*
 * Logo
 * ----
 * The brand mark: the CasaClean image asset plus the wordmark. `tone` flips
 * the wordmark for dark surfaces like the footer. Links home unless `as`
 * is overridden (e.g. a plain mark in the footer).
 */

function Mark({ className }) {
  return (
    <img
      src={logoMark}
      alt=""
      aria-hidden="true"
      className={cn(
        "size-9 rounded-full object-cover shadow-soft",
        className
      )}
    />
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
