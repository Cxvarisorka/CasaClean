import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ThemeToggle } from "../ThemeToggle";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/features/admin/context";
import { PRIMARY_NAV } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/animations/stagger";

/*
 * MobileMenu
 * ----------
 * The small-screen navigation in a right-side Drawer. Localized, includes the
 * language picker and auth/booking actions, and auto-closes on route change.
 */

export function MobileMenu({ open, onClose }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // Auto-close when navigation completes.
  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer open={open} onClose={onClose} side="right" title={t("nav.menu")}>
      <motion.ul
        variants={staggerContainer(0.05)}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-1"
      >
        {PRIMARY_NAV.map((item) => (
          <motion.li key={item.href} variants={staggerItem}>
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between rounded-xl px-4 py-3.5 text-heading-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-800 hover:bg-ink-100"
                )
              }
            >
              {t(`nav.${item.key}`)}
              <ArrowRight className="size-4 text-ink-400" />
            </NavLink>
          </motion.li>
        ))}
      </motion.ul>

      <div className="mt-6 space-y-4 border-t border-ink-100 pt-6">
        <LanguageSwitcher variant="block" />
        <ThemeToggle variant="block" />
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-ink-100 pt-6">
        <Button to={ROUTES.booking} fullWidth size="lg">
          {t("common.bookTurnover")}
        </Button>
        {isAuthenticated ? (
          <Button to={ROUTES.profile} variant="outline" fullWidth size="lg">
            {t("profile.menu")}
          </Button>
        ) : (
          <Button to={ROUTES.signin} variant="outline" fullWidth size="lg">
            {t("common.signIn")}
          </Button>
        )}
      </div>
    </Drawer>
  );
}

export default MobileMenu;
