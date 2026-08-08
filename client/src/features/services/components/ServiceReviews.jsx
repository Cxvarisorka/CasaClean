import { useState } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/shared/StarRating";
import { formatDate } from "@/utils/formatDate";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";
import {
  useServiceReviews,
  REVIEWS_PREVIEW_SIZE,
  REVIEWS_MAX,
} from "../hooks/useServiceReviews";

/*
 * ServiceReviews
 * --------------
 * What customers said about THIS service, on its detail page. Every review here
 * was written after a completed booking of the service and then approved by an
 * admin — the API only ever returns published ones, so nothing is filtered
 * client-side.
 *
 * The section renders nothing at all until there is something to show: a service
 * with no approved reviews yet gets no empty state, because an empty "reviews"
 * heading on a sales page reads worse than no heading.
 */

export function ServiceReviews({ serviceId }) {
  const { t, locale } = useTranslation();
  // "Show all" simply asks the API for a bigger page — the previous rows stay
  // on screen while it resolves (keepPreviousData in the hook).
  const [limit, setLimit] = useState(REVIEWS_PREVIEW_SIZE);
  const { reviews, reviewCount, averageRating, isLoading, isError } =
    useServiceReviews(serviceId, { limit });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // A failed request is not worth an error banner on a marketing page — the
  // reviews are supporting material, not the reason the visitor is here.
  if (isError || reviews.length === 0) return null;

  const canShowMore = reviewCount > reviews.length && limit < REVIEWS_MAX;

  return (
    <div>
      <h2 className="text-heading-md text-ink-900">
        {t("pages.serviceDetail.reviews.title")}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating rating={averageRating} size="size-5" />
        <span className="text-body-lg font-semibold text-ink-900 tabular-nums">
          {averageRating.toFixed(1)}
        </span>
        <span className="text-body-md text-ink-500">
          {t("pages.serviceDetail.reviews.subtitle", { count: reviewCount })}
        </span>
      </div>

      <motion.ul
        variants={staggerContainer(0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        {reviews.map((review) => (
          <motion.li
            key={review.id}
            variants={staggerItem}
            className="flex flex-col rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft"
          >
            <div className="flex items-center justify-between gap-3">
              <StarRating rating={review.rating} />
              <Quote className="size-5 shrink-0 text-ink-200" aria-hidden="true" />
            </div>
            <p className="mt-4 flex-1 text-body-md text-ink-700">
              {review.comment}
            </p>
            <p className="mt-5 text-body-sm text-ink-400">
              <span className="font-semibold text-ink-600">
                {review.author || t("pages.serviceDetail.reviews.anonymous")}
              </span>
              {" · "}
              {formatDate(review.createdAt, { locale })}
            </p>
          </motion.li>
        ))}
      </motion.ul>

      {canShowMore && (
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setLimit(REVIEWS_MAX)}
        >
          {t("pages.serviceDetail.reviews.showAll", { count: reviewCount })}
        </Button>
      )}
    </div>
  );
}

export default ServiceReviews;
