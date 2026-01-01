import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, initializeCsrf } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import GPNet2Dashboard from "./pages/GPNet2Dashboard";
import { RoleBasedDashboard } from "./components/RoleBasedDashboard";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CompanyList from "./pages/admin/CompanyList";
import CompanyForm from "./pages/admin/CompanyForm";
import CompanySettings from "./pages/CompanySettings";
import CasesPage from "./pages/CasesPage";
import CaseSummaryPage from "./pages/CaseSummaryPage";
import NewClaimPage from "./pages/NewClaimPage";
import RTWPlannerPage from "./pages/RTWPlannerPage";
import CheckInsPage from "./pages/CheckInsPage";
import FinancialsPage from "./pages/FinancialsPage";
import PredictionsPage from "./pages/PredictionsPage";
import RiskDashboardPage from "./pages/RiskDashboardPage";
import AuditLogPage from "./pages/AuditLogPage";
import CertificateReviewPage from "./pages/CertificateReviewPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  // Initialize CSRF token on app mount
  useEffect(() => {
    initializeCsrf();
  }, []);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider defaultTheme="light">
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <RoleBasedDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <CompanySettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cases"
                  element={
                    <ProtectedRoute>
                      <CasesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/summary/:id"
                  element={
                    <ProtectedRoute>
                      <CaseSummaryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/claims/new"
                  element={
                    <ProtectedRoute>
                      <NewClaimPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rtw-planner"
                  element={
                    <ProtectedRoute>
                      <RTWPlannerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkins"
                  element={
                    <ProtectedRoute>
                      <CheckInsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financials"
                  element={
                    <ProtectedRoute>
                      <FinancialsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predictions"
                  element={
                    <ProtectedRoute>
                      <PredictionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/risk"
                  element={
                    <ProtectedRoute>
                      <RiskDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute>
                      <AuditLogPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/certificates/review"
                  element={
                    <ProtectedRoute>
                      <CertificateReviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="companies" element={<CompanyList />} />
                  <Route path="companies/new" element={<CompanyForm />} />
                  <Route path="companies/:id" element={<CompanyForm />} />
                </Route>
              </Routes>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
