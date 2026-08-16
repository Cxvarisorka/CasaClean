import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // `npm run analyze` only (a mode rather than an env var, so the one script
    // works in every shell). Writes dist/stats.html: a treemap of what ended up
    // in which chunk, so a library drifting onto the critical path is visible.
    mode === "analyze" &&
      visualizer({
        filename: "dist/stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    // Tight enough that a chunk drifting onto the critical path is a build-time
    // signal. The default (500) is why 440 KB of bundled locales went unnoticed.
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        /*
         * Deliberate chunking keeps the vendor surface cacheable and splits
         * heavy, shared libraries out of the per-route chunks. Expressed with
         * Rolldown's `codeSplitting` rather than Rollup's `manualChunks`:
         * under Vite 8 the latter did not reliably capture React's CommonJS
         * entry, which then settled into whichever named group happened to
         * claim it — at one point `forms`, which made react-hook-form and zod
         * static dependencies of every marketing page.
         *
         * Higher `priority` wins. React is first and deliberately isolated:
         * everything imports it, so whatever chunk holds it is a dependency of
         * the entire graph.
         */
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
              priority: 100,
            },
            {
              name: "router",
              test: /[\\/]node_modules[\\/]react-router/,
              priority: 95,
            },
            // One chunk per language. `en` is left out on purpose: it is the
            // fallback every other locale resolves through, so it is always
            // needed and rides along rather than costing its own request.
            {
              name: (id) => {
                const m = /[\\/]i18n[\\/]locales[\\/](ka|it|el|ru)\.js/.exec(id);
                return m ? `locale-${m[1]}` : undefined;
              },
              priority: 90,
            },
            {
              name: "motion",
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 80,
            },
            {
              name: "query",
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              priority: 80,
            },
            // Tree-shaking leaves ~30 icon modules of 115-640 B each; as
            // separate chunks that is 30 requests to save a few KB.
            {
              name: "icons",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 80,
            },
            // Only the lazy booking/auth/contact routes reach these, so the
            // group keeps them shared between those routes without ever being
            // pulled onto the first paint.
            {
              name: "forms",
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              priority: 70,
            },
          ],
        },
      },
    },
  },
}));
