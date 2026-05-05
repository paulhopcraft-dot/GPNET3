import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CasesDashboard from "@/pages/CasesDashboard";
import { EmployerDashboardPage } from "@/pages/EmployerDashboardPage";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Partner users always land in the partner workspace (cross-client cases
  // list with sidebar). They drill into individual cases or filter by client
  // from there — no per-session "pick one client" gate.
  if (user?.role === "partner") {
    return <Navigate to="/partner/clients" replace />;
  }

  // Show employer dashboard with left sidebar navigation
  if (user?.role === "employer") {
    return <EmployerDashboardPage />;
  }

  // Default: show admin/clinician dashboard
  return <CasesDashboard />;
}
