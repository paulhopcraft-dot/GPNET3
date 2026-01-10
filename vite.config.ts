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
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-dialog', '@radix-ui/react-tooltip'],

          // Admin pages chunk
          'admin-pages': [
            './src/pages/admin/AdminDashboard',
            './src/pages/admin/CompanyList',
            './src/pages/admin/CompanyForm',
            './src/components/admin/AdminLayout'
          ],

          // Case management chunk
          'case-pages': [
            './src/pages/CasesPage',
            './src/pages/CaseSummaryPage',
            './src/pages/EmployerCaseDetailPage',
            './src/pages/NewClaimPage'
          ],

          // Analytics and reporting chunk
          'analytics-pages': [
            './src/pages/PredictionsPage',
            './src/pages/ReportsPage',
            './src/pages/RiskDashboardPage',
            './src/pages/AuditLogPage'
          ],

          // Workflow pages chunk
          'workflow-pages': [
            './src/pages/RTWPlannerPage',
            './src/pages/CheckInsPage',
            './src/pages/FinancialsPage',
            './src/pages/CertificateReviewPage'
          ],

          // Settings and utilities
          'settings-pages': [
            './src/pages/CompanySettings',
            './src/pages/SessionsPage'
          ]
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
