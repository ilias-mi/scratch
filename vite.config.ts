import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// The typography plugin wraps its :first-child / :last-child / :first-of-type rules in :where(),
// which WebKit can't pre-filter by ancestor, so it tests them on every element of the note. Removing
// an element that once had focus (closing a popup, menu or dialog) then restyles the whole note.
// App.css overrides what these rules do and restates the blockquote quotes in a filterable form.
const STRUCTURAL_IN_WHERE = /:where\([^)]*:(first|last)-(child|of-type)/;
const dropProseStructuralRules = {
  postcssPlugin: "drop-prose-structural-rules",
  Rule(rule: { selector: string; remove: () => void }) {
    if (rule.selector.includes(".prose") && STRUCTURAL_IN_WHERE.test(rule.selector)) {
      rule.remove();
    }
  },
};

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  css: {
    postcss: { plugins: [dropProseStructuralRules] },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Production build optimizations
  build: {
    // Target compatible with Tauri WebViews across platforms:
    // - macOS: WebKit (Safari 13+)
    // - Windows: WebView2 (Chromium-based)
    // - Linux: WebKitGTK
    target: ["es2021", "chrome105", "safari14"],
    // Use esbuild for fast minification
    minify: "esbuild",
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // TipTap and related editor libraries
          "tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/markdown",
            "@tiptap/extension-link",
            "@tiptap/extension-image",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-task-list",
            "@tiptap/extension-task-item",
            "@tiptap/extension-table",
            "@tiptap/extension-table-row",
            "@tiptap/extension-table-cell",
            "@tiptap/extension-table-header",
            "@tiptap/extension-code-block-lowlight",
          ],
          // Syntax highlighting
          "highlight": ["lowlight", "highlight.js"],
          // React core
          "react-vendor": ["react", "react-dom"],
          // Tauri APIs
          "tauri": [
            "@tauri-apps/api",
            "@tauri-apps/plugin-dialog",
            "@tauri-apps/plugin-opener",
          ],
        },
      },
    },
    // Enable source maps for debugging (optional, can disable for smaller builds)
    sourcemap: false,
    // Increase chunk size warning limit (TipTap is large)
    chunkSizeWarningLimit: 1000,
  },

  // Optimize dependencies
  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev startup
    include: [
      "react",
      "react-dom",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/markdown",
      "lowlight",
    ],
  },
}));
