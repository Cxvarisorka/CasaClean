/*
 * Navigation model
 * ----------------
 * Declarative nav structures consumed by the Navbar, MobileMenu and Footer.
 * Keeping these as data (not JSX) lets every surface render the same links.
 */

import { ROUTES } from "./routes";
import { SITE } from "./metadata";

export const PRIMARY_NAV = [
  { key: "services", label: "Services", href: ROUTES.services },
  { key: "about", label: "About", href: ROUTES.about },
  { key: "faq", label: "FAQ", href: ROUTES.faq },
  { key: "contact", label: "Contact", href: ROUTES.contact },
];

export const FOOTER_NAV = [
  {
    title: "Company",
    links: [
      { label: "About us", href: ROUTES.about },
      { label: "Careers", href: ROUTES.careers },
      { label: "Contact", href: ROUTES.contact },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Regular cleaning", href: ROUTES.services },
      { label: "Deep cleaning", href: ROUTES.services },
      { label: "Move-out cleaning", href: ROUTES.services },
      { label: "Office & commercial cleaning", href: ROUTES.services },
      { label: "Holiday home & Airbnb cleaning", href: ROUTES.services },
      { label: "Emergency cleaning", href: ROUTES.services },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: ROUTES.faq },
      { label: "Book a cleaning", href: ROUTES.booking },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: ROUTES.privacy },
      { label: "Terms of service", href: ROUTES.terms },
    ],
  },
];

/*
 * The footer's social icons. Derived from `SITE.social` so the footer and the
 * Organization schema's `sameAs` can never advertise a different set of
 * accounts: adding a network is one entry there, and a network the business
 * isn't on simply has no icon rather than a link to an empty profile.
 */
export const SOCIAL_LINKS = [
  { label: "Instagram", href: SITE.social.instagram, platform: "instagram" },
  { label: "Facebook", href: SITE.social.facebook, platform: "facebook" },
].filter((social) => Boolean(social.href));
