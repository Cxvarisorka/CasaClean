import { useQuery } from "@tanstack/react-query";
import {
  BLOG_POSTS,
  getPostBySlug,
  getRelatedPosts,
} from "@/data/blog";

/*
 * Blog data hooks
 * ---------------
 * The blog is backed by a local content store today, but these hooks model it
 * as async via TanStack Query. That means swapping in a real CMS/API later is a
 * one-line change to the query function — components keep their loading/empty
 * contracts unchanged.
 */

const SIMULATED_LATENCY = 500;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function useBlogPosts() {
  return useQuery({
    queryKey: ["blog", "list"],
    queryFn: async () => {
      await delay(SIMULATED_LATENCY);
      return BLOG_POSTS;
    },
  });
}

export function useBlogPost(slug) {
  return useQuery({
    queryKey: ["blog", "post", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      await delay(SIMULATED_LATENCY);
      const post = getPostBySlug(slug);
      if (!post) throw Object.assign(new Error("Post not found"), { status: 404 });
      return { post, related: getRelatedPosts(slug) };
    },
  });
}
