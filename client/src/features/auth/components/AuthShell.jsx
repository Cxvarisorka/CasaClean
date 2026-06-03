import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, ShieldCheck, Star } from "lucide-react";
import { Image } from "@/components/ui/Image";
import { Logo } from "@/components/shared/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";
import { IMAGES } from "@/constants/images";
import { staggerContainer, staggerItem } from "@/animations/stagger";

/*
 * AuthShell
 * ---------
 * The premium split layout shared by sign-in and sign-up: a photographic brand
 * panel (with social proof) beside the form column. The form is passed as
 * children, keeping each auth page focused purely on its fields.
 */

const PROOF_ICONS = [BadgeCheck, Star, ShieldCheck];

export function AuthShell({ children }) {
  const { t } = useTranslation();
  const proof = [t("auth.panelStat1"), t("auth.panelStat2"), t("auth.panelStat3")];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <Image
          src={IMAGES.interiorLux}
          alt=""
          aria-hidden="true"
          priority
          rounded="rounded-none"
          className="absolute inset-0 size-full"
          imgClassName="opacity-40"
          gradient="from-ink-800 to-ink-950"
        />
        <div
          className="absolute inset-0 bg-gradient-to-tr from-ink-950 via-ink-950/80 to-brand-900/40"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo tone="dark" />

          <motion.div
            variants={staggerContainer(0.12)}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 variants={staggerItem} className="text-heading-xl text-white">
              {t("auth.panelTitle")}
            </motion.h2>
            <motion.p
              variants={staggerItem}
              className="mt-4 max-w-md text-body-lg text-ink-300"
            >
              {t("auth.panelSubtitle")}
            </motion.p>

            <motion.ul variants={staggerItem} className="mt-10 space-y-3">
              {proof.map((line, i) => {
                const Icon = PROOF_ICONS[i];
                return (
                  <li key={line} className="flex items-center gap-3 text-body-md text-ink-200">
                    <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-brand-300">
                      <Icon className="size-5" />
                    </span>
                    {line}
                  </li>
                );
              })}
            </motion.ul>
          </motion.div>

          <p className="text-caption text-ink-500">© {new Date().getFullYear()} CasaClean</p>
        </div>
      </aside>

      {/* Form column */}
      <main className="relative flex flex-col">
        <header className="flex items-center justify-between p-5 sm:p-6">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="size-4" /> {t("auth.backToSite")}
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            {/* Mobile logo (panel is hidden on small screens) */}
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default AuthShell;
