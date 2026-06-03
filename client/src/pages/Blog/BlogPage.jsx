import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { PageHero, CtaSection } from "@/components/sections";
import { BlogCard, useBlogPosts } from "@/features/blog";
import { useDebounce } from "@/hooks/useDebounce";
import { useTranslation } from "@/i18n";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { IMAGES } from "@/constants/images";
import { BLOG_CATEGORIES } from "@/data/blog";
import { staggerContainer } from "@/animations/stagger";

/*
 * BlogPage
 * --------
 * The article index with client-side search, category filtering and
 * pagination. Demonstrates the full async UX contract: loading skeletons,
 * results, and an empty state — all driven by the useBlogPosts query.
 */

const PAGE_SIZE = 5;

const BlogPage = () => {
  const { t } = useTranslation();
  const { data: posts, isLoading } = useBlogPosts();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 250);

  const filtered = useMemo(() => {
    if (!posts) return [];
    return posts.filter((post) => {
      const matchesCategory = category === "All" || post.category === category;
      const haystack = `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase();
      const matchesQuery = haystack.includes(debouncedQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [posts, category, debouncedQuery]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to first page whenever the filter/search changes.
  const handleCategory = (value) => {
    setCategory(value);
    setPage(1);
  };
  const handleSearch = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  return (
    <Page>
      <Seo {...PAGE_META.blog} />

      <PageHero
        image={IMAGES.interiorLux}
        eyebrow={t("pages.blog.heroEyebrow")}
        title={t("pages.blog.heroTitle")}
        subtitle={t("pages.blog.heroSubtitle")}
      />

      <section className="pb-20 lg:pb-28">
        <Container>
          {/* Controls */}
          <div className="flex flex-col items-center justify-between gap-5 lg:flex-row">
            <Tabs value={category} onValueChange={handleCategory}>
              <Tabs.List className="flex-wrap">
                {BLOG_CATEGORIES.map((cat) => (
                  <Tabs.Trigger key={cat} value={cat}>
                    {cat === "All" ? t("pages.blog.allArticles") : cat}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>

            <div className="w-full lg:max-w-xs">
              <Input
                type="search"
                placeholder={t("pages.blog.searchPlaceholder")}
                value={query}
                onChange={handleSearch}
                leftIcon={Search}
                aria-label={t("pages.blog.searchPlaceholder")}
              />
            </div>
          </div>

          {/* Results */}
          <div className="mt-12">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton.Card key={i} />
                ))}
              </div>
            ) : paged.length === 0 ? (
              <EmptyState
                icon={Search}
                title={t("pages.blog.noResultsTitle")}
                description={t("pages.blog.noResultsBody")}
              />
            ) : (
              <motion.div
                key={`${category}-${debouncedQuery}-${page}`}
                variants={staggerContainer(0.08)}
                initial="hidden"
                animate="visible"
                className="grid gap-6 md:grid-cols-2"
              >
                {paged.map((post, i) => (
                  <BlogCard
                    key={post.slug}
                    post={post}
                    featured={i === 0 && page === 1 && post.featured}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              total={totalPages}
              onChange={setPage}
              className="mt-14"
            />
          )}
        </Container>
      </section>

      <CtaSection
        eyebrow={t("pages.blog.ctaEyebrow")}
        title={t("pages.blog.ctaTitle")}
        subtitle={t("pages.blog.ctaSubtitle")}
      />
    </Page>
  );
};

export default BlogPage;
