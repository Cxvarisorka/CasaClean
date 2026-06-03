import { motion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero, CtaSection } from "@/components/sections";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Icon } from "@/components/shared/Icon";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { PERKS, OPEN_ROLES } from "@/data/careers";
import { IMAGES } from "@/constants/images";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * CareersPage
 * -----------
 * Recruiting surface: culture/perks plus the live roles list. Demonstrates the
 * EmptyState primitive as a graceful fallback when there are no openings.
 */

const CareersPage = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <Seo {...PAGE_META.careers} />

      <PageHero
        image={IMAGES.dining}
        eyebrow={t("pages.careers.heroEyebrow")}
        title={t("pages.careers.heroTitle")}
        subtitle={t("pages.careers.heroSubtitle")}
        actions={
          <Button href="#open-roles" size="lg">
            {t("pages.careers.seeRoles")}
          </Button>
        }
      />

      {/* Perks */}
      <section className="py-16 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow={t("pages.careers.perksEyebrow")}
            title={t("pages.careers.perksTitle")}
          />
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PERKS.map((perk) => (
              <motion.div
                key={perk.id}
                variants={staggerItem}
                className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon name={perk.icon} className="size-6" />
                </span>
                <h3 className="mt-5 text-heading-sm text-ink-900">
                  {t(`perks.${perk.id}.title`)}
                </h3>
                <p className="mt-2 text-body-sm text-ink-500">
                  {t(`perks.${perk.id}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Open roles */}
      <section id="open-roles" className="bg-sand-50 py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow={t("pages.careers.rolesEyebrow")}
            title={t("pages.careers.rolesTitle")}
          />

          <motion.ul
            variants={staggerContainer(0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-12 space-y-3"
          >
            {OPEN_ROLES.length === 0 ? (
              <EmptyState
                title={t("pages.careers.noRolesTitle")}
                description={t("pages.careers.noRolesBody")}
                action={<Button to={ROUTES.contact}>{t("pages.careers.getInTouch")}</Button>}
              />
            ) : (
              OPEN_ROLES.map((role) => (
                <motion.li key={role.id} variants={staggerItem}>
                  <a
                    href={`mailto:careers@casaclean.com?subject=Application: ${role.title}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft transition-shadow hover:shadow-medium sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-heading-sm text-ink-900">{role.title}</h3>
                        <Badge variant="neutral" size="sm">
                          {t(`teams.${role.team}`)}
                        </Badge>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-body-sm text-ink-500">
                        <MapPin className="size-4" /> {role.location} · {t(`roleTypes.${role.type}`)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand-600">
                      {t("pages.careers.apply")}
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>
                </motion.li>
              ))
            )}
          </motion.ul>
        </Container>
      </section>

      <CtaSection
        eyebrow={t("pages.careers.ctaEyebrow")}
        title={t("pages.careers.ctaTitle")}
        subtitle={t("pages.careers.ctaSubtitle")}
        primaryLabel={t("pages.careers.sendCv")}
        primaryTo={ROUTES.contact}
        secondaryLabel={t("pages.careers.learnAbout")}
      />
    </Page>
  );
};

export default CareersPage;
