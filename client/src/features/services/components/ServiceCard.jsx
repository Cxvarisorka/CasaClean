import { ArrowUpRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { Icon } from "@/components/shared/Icon";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";
import { staggerItemScale } from "@/animations/stagger";

/*
 * ServiceCard
 * -----------
 * Presentation component for a single service. Purely driven by props (a
 * service object), so it's reused identically on the Home overview and the
 * Services index. `featured` highlights the popular offering.
 */

export function ServiceCard({ service, featured = false }) {
  const { t } = useTranslation();
  const name = t(`services.${service.id}.name`);
  const tagline = t(`services.${service.id}.tagline`);
  const description = t(`services.${service.id}.description`);
  const features = t(`services.${service.id}.features`);
  const featureList = Array.isArray(features) ? features : service.features;

  return (
    <motion.div variants={staggerItemScale} className="h-full">
      <Card
        interactive
        variant={featured ? "elevated" : "default"}
        className="flex h-full flex-col overflow-hidden"
      >
        {/* Image header */}
        <Image
          src={service.image}
          alt={name}
          aspect="aspect-[16/10]"
          rounded="rounded-none"
          zoomOnHover
          gradient="from-brand-400 to-brand-600"
          overlay={
            <>
              <span className="absolute left-4 top-4 grid size-11 place-items-center rounded-2xl bg-surface/95 text-brand-600 shadow-soft backdrop-blur">
                <Icon name={service.icon} className="size-6" />
              </span>
              {service.popular && (
                <Badge variant="accent" className="absolute right-4 top-4">
                  {t("servicesSection.mostBooked")}
                </Badge>
              )}
            </>
          }
        />

        <Card.Body className="flex flex-1 flex-col">
          <h3 className="text-heading-sm text-ink-900">{name}</h3>
          <p className="mt-1 text-body-sm font-medium text-brand-600">
            {tagline}
          </p>
          <p className="mt-3 text-body-md text-ink-500">{description}</p>

          <ul className="mt-5 space-y-2.5">
            {featureList.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-body-sm text-ink-700">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-500" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center justify-between pt-6">
            <p className="text-body-sm text-ink-500">
              {t("common.from")}{" "}
              <span className="text-heading-sm font-bold text-ink-900">
                {formatCurrency(service.startingAt)}
              </span>
            </p>
            <Link
              to={ROUTES.booking}
              className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              {t("servicesSection.bookNow")}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  );
}

export default ServiceCard;
