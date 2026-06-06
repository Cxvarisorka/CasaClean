import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Image } from "@/components/ui/Image";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { BlogCard, useBlogPost } from "@/features/blog";
import { Seo, articleSchema, breadcrumbSchema } from "@/seo";
import { formatDate } from "@/utils/formatDate";
import { ROUTES } from "@/constants/routes";
import { IMAGES } from "@/constants/images";
import { useTranslation } from "@/i18n";
import { staggerContainer } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * BlogPostPage
 * ------------
 * Renders a single article from a lightweight block model (paragraphs,
 * headings, quotes). Handles loading and not-found states, emits Article +
 * Breadcrumb structured data, and surfaces related reading.
 */

function ArticleBlocks({ blocks }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        if (block.type === "h2")
          return (
            <h2 key={i} className="text-heading-md pt-2 text-ink-900">
              {block.text}
            </h2>
          );
        if (block.type === "quote")
          return (
            <blockquote
              key={i}
              className="border-l-4 border-ink-300 bg-white py-4 pl-6 pr-4 text-heading-sm font-medium italic text-black"
            >
              {block.text}
            </blockquote>
          );
        return (
          <p key={i} className="text-body-lg text-ink-600">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

const BlogPostPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { data, isLoading, isError } = useBlogPost(slug);

  if (isLoading) {
    return (
      <Page>
        <Container size="sm" className="py-32">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-6 h-12 w-full" />
          <Skeleton className="mt-3 h-12 w-2/3" />
          <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
          <div className="mt-8">
            <Skeleton.Text lines={6} />
          </div>
        </Container>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Container size="sm" className="py-32">
          <EmptyState
            title={t("pages.blog.notFoundTitle")}
            description={t("pages.blog.notFoundBody")}
            action={
              <Button to={ROUTES.blog} leftIcon={ArrowLeft}>
                {t("pages.blog.backToBlog")}
              </Button>
            }
          />
        </Container>
      </Page>
    );
  }

  const { post, related } = data;

  return (
    <Page>
      <Seo
        title={post.title}
        description={post.excerpt}
        path={ROUTES.blogPost(post.slug)}
        type="article"
        schema={[
          articleSchema(post),
          breadcrumbSchema([
            { name: "Blog", path: ROUTES.blog },
            { name: post.title, path: ROUTES.blogPost(post.slug) },
          ]),
        ]}
      />

      {/* Header */}
      <header className="relative overflow-hidden bg-grid pt-32 pb-12 lg:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" aria-hidden="true" />
        <Container size="sm" className="relative">
          <Link
            to={ROUTES.blog}
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="size-4" /> {t("pages.blog.allArticles")}
          </Link>

          <Badge variant="brand" className="mt-6">
            {post.category}
          </Badge>
          <h1 className="mt-4 text-heading-xl text-balance text-ink-900">{post.title}</h1>

          <div className="mt-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-caption font-bold text-white">
              {post.author.avatar}
            </span>
            <div className="text-body-sm">
              <p className="font-semibold text-ink-800">{post.author.name}</p>
              <p className="text-ink-400">
                {formatDate(post.publishedAt)} ·{" "}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {post.readingMinutes} {t("pages.blog.minRead")}
                </span>
              </p>
            </div>
          </div>
        </Container>
      </header>

      {/* Cover */}
      <Container size="sm">
        <Image
          src={IMAGES.blog[post.slug]}
          alt={post.title}
          aspect="aspect-[16/8]"
          rounded="rounded-3xl"
          priority
          gradient={post.cover}
          className="w-full shadow-large"
        />
      </Container>

      {/* Body */}
      <article className="py-12 lg:py-16">
        <Container size="sm">
          <ArticleBlocks blocks={post.body} />

          <div className="mt-10 flex flex-wrap gap-2 border-t border-ink-100 pt-8">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="neutral" size="sm">
                #{tag}
              </Badge>
            ))}
          </div>
        </Container>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-sand-50 py-20 lg:py-24">
          <Container>
            <SectionHeading
              align="left"
              eyebrow={t("pages.blog.relatedEyebrow")}
              title={t("pages.blog.relatedTitle")}
            />
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="mt-10 grid gap-6 md:grid-cols-3"
            >
              {related.map((item) => (
                <BlogCard key={item.slug} post={item} />
              ))}
            </motion.div>
          </Container>
        </section>
      )}
    </Page>
  );
};

export default BlogPostPage;
