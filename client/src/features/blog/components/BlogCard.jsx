import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { formatDate } from "@/utils/formatDate";
import { ROUTES } from "@/constants/routes";
import { IMAGES } from "@/constants/images";
import { useTranslation } from "@/i18n";
import { staggerItemScale } from "@/animations/stagger";

/*
 * BlogCard
 * --------
 * Article preview card. The cover is a brand gradient (from the post's `cover`
 * token) so the blog ships with zero image assets while still feeling rich.
 * `featured` renders a larger, horizontal hero variant.
 */

export function BlogCard({ post, featured = false }) {
  const { t } = useTranslation();

  return (
    <motion.article
      variants={staggerItemScale}
      className={cn(
        "group h-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-shadow hover:shadow-large",
        featured && "lg:col-span-2 lg:grid lg:grid-cols-2"
      )}
    >
      <Link to={ROUTES.blogPost(post.slug)} className="block h-full">
        <Image
          src={IMAGES.blog[post.slug]}
          alt={post.title}
          rounded="rounded-none"
          zoomOnHover
          gradient={post.cover}
          className={cn(
            featured ? "aspect-[16/10] lg:aspect-auto lg:h-full" : "aspect-[16/10]"
          )}
          overlay={
            <>
              <div
                className="absolute inset-0 bg-gradient-to-t from-ink-950/40 to-transparent"
                aria-hidden="true"
              />
              <Badge variant="dark" className="absolute bottom-4 left-4">
                {post.category}
              </Badge>
            </>
          }
        />

        <div className="flex flex-col p-6">
          <div className="flex items-center gap-3 text-caption text-ink-400">
            <span>{formatDate(post.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {post.readingMinutes} {t("pages.blog.minRead")}
            </span>
          </div>

          <h3
            className={cn(
              "mt-3 text-balance font-display font-bold tracking-tight text-ink-900 transition-colors group-hover:text-brand-700",
              featured ? "text-heading-md" : "text-heading-sm"
            )}
          >
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-body-md text-ink-500">{post.excerpt}</p>

          <div className="mt-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-caption font-bold text-white">
              {post.author.avatar}
            </span>
            <div className="text-body-sm">
              <p className="font-semibold text-ink-800">{post.author.name}</p>
              <p className="text-ink-400">{post.author.role}</p>
            </div>
            <ArrowUpRight className="ml-auto size-5 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600" />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default BlogCard;
