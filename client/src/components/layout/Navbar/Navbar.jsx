import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ThemeToggle } from "../ThemeToggle";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/features/admin/context";
import { PRIMARY_NAV } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { MobileMenu } from "../MobileMenu";

/*
 * Navbar
 * ------
 * The sticky, premium top navigation. Transitions from transparent to a
 * frosted-glass surface on scroll, localizes all labels via the i18n context,
 * hosts the language switcher and auth entry points, and delegates the mobile
 * experience to a Drawer-based MobileMenu.
 */

export function Navbar() {
  const { scrolled } = useScrollPosition();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = user?.fullname?.split(" ")[0] || t("profile.menu");

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "glass border-b border-ink-100/80 py-2.5 shadow-soft"
            : "bg-transparent py-4"
        )}
      >
        <Container>
          <nav className="flex items-center justify-between gap-6">
            <Logo className="shrink-0" />

            {/* flex-1 + center keeps the links in the middle of the bar so they
                never crowd the logo — important for wider locales (e.g. Georgian),
                where labels are longer than English. */}
            <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
                        isActive
                          ? "text-brand-700"
                          : "text-ink-600 hover:text-ink-900 hover:bg-ink-100/70"
                      )
                    }
                  >
                    {t(`nav.${item.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="hidden items-center gap-1.5 lg:flex">
              <ThemeToggle />
              <LanguageSwitcher />
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" to={ROUTES.profile} leftIcon={User}>
                  {firstName}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" to={ROUTES.signin}>
                  {t("common.signIn")}
                </Button>
              )}
              <Button to={ROUTES.booking} size="sm">
                {t("common.bookTurnover")}
              </Button>
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label={t("nav.menu")}
                className="grid size-11 place-items-center rounded-full text-ink-800 transition-colors hover:bg-ink-100"
              >
                <Menu className="size-6" />
              </button>
            </div>
          </nav>
        </Container>
      </motion.header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

export default Navbar;
