import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";

// Standalone Vitest config (kept separate from vite.config.js so the app build
// pipeline — tailwind plugin, manual chunking — never runs during tests).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    restoreMocks: true,
  },
});
