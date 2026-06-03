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
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * CareersPage
 * -----------
 * Recruiting surface: culture/perks plus the live roles list. Demonstrates the
 * EmptyState primitive as a graceful fallback when there are no openings.
 */

const CareersPage = () => {
  return (
    <Page>
      <Seo {...PAGE_META.careers} />

      <PageHero
        image={IMAGES.dining}
        eyebrow="Careers"
        title="Build the operating system for short-term rentals"
        subtitle="We're a team that takes pride in the craft of hospitality operations. Come do the best work of your career."
        actions={
          <Button href="#open-roles" size="lg">
            See open roles
          </Button>
        }
      />

      {/* Perks */}
      <section className="py-16 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow="Why join us"
            title="More than a job — a place to grow"
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
                className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon name={perk.icon} className="size-6" />
                </span>
                <h3 className="mt-5 text-heading-sm text-ink-900">{perk.title}</h3>
                <p className="mt-2 text-body-sm text-ink-500">{perk.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Open roles */}
      <section id="open-roles" className="bg-sand-50 py-20 lg:py-28">
        <Container size="md">
          <SectionHeading eyebrow="Open positions" title="Find your role" />

          <motion.ul
            variants={staggerContainer(0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-12 space-y-3"
          >
            {OPEN_ROLES.length === 0 ? (
              <EmptyState
                title="No open roles right now"
                description="We're always meeting great people. Send us your CV and we'll reach out when something fits."
                action={<Button to={ROUTES.contact}>Get in touch</Button>}
              />
            ) : (
              OPEN_ROLES.map((role) => (
                <motion.li key={role.id} variants={staggerItem}>
                  <a
                    href={`mailto:careers@casaclean.com?subject=Application: ${role.title}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-medium sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-heading-sm text-ink-900">{role.title}</h3>
                        <Badge variant="neutral" size="sm">
                          {role.team}
                        </Badge>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-body-sm text-ink-500">
                        <MapPin className="size-4" /> {role.location} · {role.type}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand-600">
                      Apply
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
        eyebrow="Don't see your role?"
        title="We're always looking for great people"
        subtitle="Tell us how you'd make CasaClean better and we'll find a way to talk."
        primaryLabel="Send your CV"
        primaryTo={ROUTES.contact}
        secondaryLabel="Learn about us"
      />
    </Page>
  );
};

export default CareersPage;
