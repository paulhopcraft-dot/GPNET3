import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CasesPage from "./pages/CasesPage";
import ClaimsIntakePage from "./pages/ClaimsIntakePage";
import RTWPlannerPage from "./pages/RTWPlannerPage";
import FinancialsPage from "./pages/FinancialsPage";
import CheckinsPage from "./pages/CheckinsPage";
import PredictionsPage from "./pages/PredictionsPage";
import RiskDashboardPage from "./pages/RiskDashboardPage";
import AuditLogPage from "./pages/AuditLogPage";
import CaseSummaryPage from "./pages/CaseSummaryPage";

// Placeholder pages for routes not yet built
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider defaultTheme="light">
            <AuthProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
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
                  path="/claims/new"
                  element={
                    <ProtectedRoute>
                      <ClaimsIntakePage />
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
                      <CheckinsPage />
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
                  path="/summary"
                  element={
                    <ProtectedRoute>
                      <CaseSummaryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <PlaceholderPage title="User Management" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <PlaceholderPage title="Settings" />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
