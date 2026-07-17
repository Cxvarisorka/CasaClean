import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, LogOut, ChevronDown, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/cn";
import { useAuth } from "../context";

/*
 * AdminTopbar
 * -----------
 * The sticky header above each page: the mobile menu trigger on the left and
 * the global controls (language, theme, account menu) on the right. The account
 * menu is a small accessible popover that closes on outside-click / Escape.
 */

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";

export function AdminTopbar({ onOpenSidebar }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-100 bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label={t("admin.topbar.openNav")}
        className="grid size-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden"
      >
        <Menu className="size-5.5" />
      </button>

      <div className="hidden text-body-sm font-medium text-ink-400 lg:block">
        {t("admin.topbar.console")}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Opens the full live website in a new tab so the admin can review
            changes (services, cities, prices, …) on the real site without
            leaving the panel. */}
        <a
          href={ROUTES.home}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-1 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-body-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
        >
          <ExternalLink className="size-4.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{t("admin.topbar.viewLive")}</span>
        </a>

        <LanguageSwitcher />
        <ThemeToggle />

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
          >
            <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-body-sm font-bold text-white">
              {initials(user?.fullname)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-body-sm font-semibold leading-tight text-ink-900">
                {user?.fullname || t("admin.topbar.adminFallback")}
              </span>
              <span className="block text-caption leading-tight text-ink-400">
                {t("admin.topbar.administrator")}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-ink-400 sm:block" />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-surface p-1.5 shadow-large"
              >
                <div className="border-b border-ink-100 px-3 py-3">
                  <p className="text-body-sm font-semibold text-ink-900">
                    {user?.fullname || t("admin.topbar.adminFallback")}
                  </p>
                  <p className="truncate text-caption text-ink-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className={cn(
                    "mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-body-sm font-medium",
                    "text-red-600 transition-colors hover:bg-red-500/10 hover:text-red-700",
                    "dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                  )}
                >
                  <LogOut className="size-4.5" />
                  {t("admin.topbar.signOut")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
