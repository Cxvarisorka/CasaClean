import {
  HelpCircle,
  // Services
  Sparkles,
  BedDouble,
  PackageCheck,
  ClipboardCheck,
  Droplets,
  DoorOpen,
  // Differentiators / values
  ShieldCheck,
  Layers,
  BadgeCheck,
  HeartHandshake,
  TrendingUp,
  // Workflow
  CalendarCheck,
  // Careers perks
  Wallet,
  CalendarHeart,
  GraduationCap,
  HeartPulse,
  Users,
} from "lucide-react";

/*
 * Icon
 * ----
 * Resolves a Lucide icon by string name so data files can reference icons
 * declaratively (e.g. { icon: "Sparkles" }) without importing components.
 *
 * Icons are registered explicitly (not via `import * as`) so the bundler can
 * tree-shake the icon set to only what we actually use — keeping the icon
 * library out of the critical-path bundle. Add a name here when data needs it.
 */

const REGISTRY = {
  Sparkles,
  BedDouble,
  PackageCheck,
  ClipboardCheck,
  Droplets,
  DoorOpen,
  ShieldCheck,
  Layers,
  BadgeCheck,
  HeartHandshake,
  TrendingUp,
  CalendarCheck,
  Wallet,
  CalendarHeart,
  GraduationCap,
  HeartPulse,
  Users,
};

export function Icon({ name, ...props }) {
  const Resolved = REGISTRY[name] || HelpCircle;
  return <Resolved {...props} />;
}

export default Icon;
