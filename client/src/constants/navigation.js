/*
 * Navigation model
 * ----------------
 * Declarative nav structures consumed by the Navbar, MobileMenu and Footer.
 * Keeping these as data (not JSX) lets every surface render the same links.
 */

import { ROUTES } from "./routes";

export const PRIMARY_NAV = [
  { key: "services", label: "Services", href: ROUTES.services },
  { key: "pricing", label: "Pricing", href: ROUTES.pricing },
  { key: "about", label: "About", href: ROUTES.about },
  { key: "blog", label: "Blog", href: ROUTES.blog },
  { key: "faq", label: "FAQ", href: ROUTES.faq },
  { key: "contact", label: "Contact", href: ROUTES.contact },
];

export const FOOTER_NAV = [
  {
    title: "Company",
    links: [
      { label: "About us", href: ROUTES.about },
      { label: "Careers", href: ROUTES.careers },
      { label: "Blog", href: ROUTES.blog },
      { label: "Contact", href: ROUTES.contact },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Turnover cleaning", href: ROUTES.services },
      { label: "Linen management", href: ROUTES.services },
      { label: "Restocking", href: ROUTES.services },
      { label: "Inspections", href: ROUTES.services },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Pricing", href: ROUTES.pricing },
      { label: "FAQ", href: ROUTES.faq },
      { label: "Book a turnover", href: ROUTES.booking },
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

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com", platform: "instagram" },
  { label: "LinkedIn", href: "https://linkedin.com", platform: "linkedin" },
  { label: "Facebook", href: "https://facebook.com", platform: "facebook" },
  { label: "X", href: "https://x.com", platform: "twitter" },
];
