import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 800, // Increase warning limit to 800KB for vendor chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries - split by size/importance
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router-dom/')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // Heavy chart libraries - separate chunk
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-framer-motion';
          }

          // UI libraries
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          // Markdown libraries
          if (id.includes('node_modules/react-markdown/') || id.includes('node_modules/remark-gfm/') || id.includes('node_modules/micromark/') || id.includes('node_modules/mdast/')) {
            return 'vendor-markdown';
          }

          // Form and validation libraries
          if (id.includes('node_modules/react-hook-form/') || id.includes('node_modules/zod/')) {
            return 'vendor-forms';
          }

          // Date/time libraries
          if (id.includes('node_modules/date-fns/') || id.includes('node_modules/dayjs/')) {
            return 'vendor-date';
          }

          // Utility libraries
          if (id.includes('node_modules/clsx/') || id.includes('node_modules/class-variance-authority/') || id.includes('node_modules/tailwind-merge/')) {
            return 'vendor-utils';
          }

          // Other vendor libraries (fallback)
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }

          // Admin pages
          if (id.includes('/admin/') || id.includes('/pages/admin/')) {
            return 'pages-admin';
          }

          // Heavy case detail page (separate chunk due to size)
          if (id.includes('EmployerCaseDetailPage') || id.includes('DynamicRecoveryTimeline')) {
            return 'pages-case-detail';
          }

          // Other case pages
          if (id.includes('/pages/Cases') || id.includes('/pages/CaseSummary') || id.includes('/pages/NewClaim')) {
            return 'pages-case';
          }

          // Analytics and reporting
          if (id.includes('/pages/Predictions') || id.includes('/pages/Reports') || id.includes('/pages/Risk') || id.includes('/pages/Audit')) {
            return 'pages-analytics';
          }

          // Workflow pages
          if (id.includes('/pages/RTW') || id.includes('/pages/CheckIns') || id.includes('/pages/Financials') || id.includes('/pages/Certificate')) {
            return 'pages-workflow';
          }

          // Settings and employer pages
          if (id.includes('/pages/Company') || id.includes('/pages/Sessions') || id.includes('/pages/Employer')) {
            return 'pages-settings';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
