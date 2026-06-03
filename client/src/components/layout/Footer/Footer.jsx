import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/shared/Logo";
import { SocialIcon } from "@/components/shared/SocialIcon";
import { NewsletterForm } from "@/features/contact/components/NewsletterForm";
import { useTranslation } from "@/i18n";
import { FOOTER_NAV, SOCIAL_LINKS } from "@/constants/navigation";
import { SITE } from "@/constants/metadata";

/*
 * Footer
 * ------
 * The site-wide footer: brand + newsletter, structured link columns sourced
 * from the navigation model, contact details and social links. Rendered on a
 * deep ink surface for a premium, grounded close to every page.
 */

export function Footer() {
  const year = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <footer className="bg-ink-950 text-ink-300">
      <Container className="py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand + newsletter */}
          <div className="max-w-sm">
            <Logo tone="dark" />
            <p className="mt-5 text-body-md text-ink-400">{t("footer.blurb")}</p>

            <div className="mt-8">
              <p className="text-body-sm font-semibold text-white">
                {t("footer.newsletterTitle")}
              </p>
              <NewsletterForm className="mt-3" tone="dark" />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_NAV.map((column) => (
              <nav key={column.title} aria-label={t(`footer.columns.${column.title}`)}>
                <h3 className="text-caption font-semibold uppercase tracking-wider text-ink-500">
                  {t(`footer.columns.${column.title}`)}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-body-sm text-ink-400 transition-colors hover:text-white"
                      >
                        {t(`footer.links.${link.label}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Contact strip */}
        <div className="mt-14 grid gap-4 border-t border-ink-800 pt-10 sm:grid-cols-3">
          <a
            href={`mailto:${SITE.email}`}
            className="flex items-center gap-3 text-body-sm text-ink-400 transition-colors hover:text-white"
          >
            <Mail className="size-4.5 text-brand-400" /> {SITE.email}
          </a>
          <a
            href="tel:+390612345678"
            className="flex items-center gap-3 text-body-sm text-ink-400 transition-colors hover:text-white"
          >
            <Phone className="size-4.5 text-brand-400" /> {SITE.phone}
          </a>
          <span className="flex items-center gap-3 text-body-sm text-ink-400">
            <MapPin className="size-4.5 text-brand-400" /> {SITE.address.street},{" "}
            {SITE.address.city}
          </span>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-ink-800 pt-8 sm:flex-row">
          <p className="text-caption text-ink-500">
            © {year} {SITE.legalName}. {t("footer.rights")}
          </p>
          <ul className="flex items-center gap-2">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-10 place-items-center rounded-full bg-ink-900 text-ink-400 transition-colors hover:bg-brand-600 hover:text-white"
                >
                  <SocialIcon platform={social.platform} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
