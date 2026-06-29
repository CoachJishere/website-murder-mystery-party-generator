import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// NOTE: there is no SPA/route prerendering wired into this Vite build. SEO for
// each surface is delivered as follows (see ADR-0024):
//   - Homepage (/) and other shell routes: the static <head> in index.html,
//     re-synced client-side by src/components/Head.tsx (react-helmet-async).
//   - Blog posts: per-post static HTML generated post-build by
//     scripts/prerender-blog.mjs.
// A dead `routesToPrerender` array used to live here implying the homepage was
// prerendered; it was never consumed by any plugin. Removed 2026-06-29.

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Define environment variables for client-side code
  define: {
    // Set NODE_ENV for production/development detection
    'process.env.NODE_ENV': JSON.stringify(mode),
    // Ensure process.env is defined for libraries that expect it
    'process.env': {}
  },
  optimizeDeps: {
    include: ['react-markdown', 'rehype-raw']
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    // Make output directory clean on each build
    emptyOutDir: true,
    // Output directory
    outDir: 'dist',
    // Optimize chunks for better loading performance
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-toast']
        }
      }
    }
  }
}));
