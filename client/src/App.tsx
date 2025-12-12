import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import GPNet2Dashboard from "./pages/GPNet2Dashboard";
import LoginPage from "./pages/LoginPage";
import CasesPage from "./pages/CasesPage";
import CaseSummaryPage from "./pages/CaseSummaryPage";
import NewClaimPage from "./pages/NewClaimPage";
import RTWPlannerPage from "./pages/RTWPlannerPage";
import CheckInsPage from "./pages/CheckInsPage";
import FinancialsPage from "./pages/FinancialsPage";
import PredictionsPage from "./pages/PredictionsPage";
import RiskDashboardPage from "./pages/RiskDashboardPage";
import AuditLogPage from "./pages/AuditLogPage";

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider defaultTheme="light">
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <GPNet2Dashboard />
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
              </Routes>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
