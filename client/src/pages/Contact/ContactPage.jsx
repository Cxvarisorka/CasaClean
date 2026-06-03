import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections";
import { Reveal } from "@/components/shared/Reveal";
import { ContactForm } from "@/features/contact";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { SITE } from "@/constants/metadata";
import { IMAGES } from "@/constants/images";

/*
 * ContactPage
 * -----------
 * A two-column contact layout: reassuring contact channels alongside the
 * validated ContactForm (which owns its own submission + success states).
 */

const CHANNELS = [
  {
    icon: Mail,
    label: "Email us",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    note: "We reply within one business day",
  },
  {
    icon: Phone,
    label: "Call us",
    value: SITE.phone,
    href: "tel:+390612345678",
    note: "Mon–Sat, 9:00–18:00 CET",
  },
  {
    icon: MapPin,
    label: "Visit",
    value: `${SITE.address.street}, ${SITE.address.city}`,
    note: "By appointment",
  },
];

const ContactPage = () => {
  return (
    <Page>
      <Seo {...PAGE_META.contact} />

      <PageHero
        image={IMAGES.bathroom}
        eyebrow="Contact"
        title="Let's get your turnovers handled"
        subtitle="Questions about coverage, pricing or onboarding a portfolio? We're here to help."
      />

      <section className="pb-20 lg:pb-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Channels */}
            <Reveal className="space-y-4">
              {CHANNELS.map((channel) => {
                const Inner = (
                  <>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <channel.icon className="size-6" />
                    </span>
                    <div>
                      <p className="text-body-sm font-semibold text-ink-900">
                        {channel.label}
                      </p>
                      <p className="text-body-md text-ink-700">{channel.value}</p>
                      <p className="mt-0.5 text-caption text-ink-400">{channel.note}</p>
                    </div>
                  </>
                );
                return channel.href ? (
                  <a
                    key={channel.label}
                    href={channel.href}
                    className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-medium"
                  >
                    {Inner}
                  </a>
                ) : (
                  <div
                    key={channel.label}
                    className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
                  >
                    {Inner}
                  </div>
                );
              })}

              <div className="flex items-start gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-soft">
                  <MessageSquare className="size-6" />
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-ink-900">
                    Property manager?
                  </p>
                  <p className="text-body-sm text-ink-600">
                    Ask about volume pricing and our multi-property dashboard.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-medium sm:p-9">
                <h2 className="text-heading-md text-ink-900">Send us a message</h2>
                <p className="mt-1.5 text-body-md text-ink-500">
                  Fill in the form and we'll be in touch shortly.
                </p>
                <div className="mt-7">
                  <ContactForm />
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </Page>
  );
};

export default ContactPage;
