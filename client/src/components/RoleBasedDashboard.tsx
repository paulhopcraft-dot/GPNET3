import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CasesDashboard from "@/pages/CasesDashboard";
import { EmployerDashboardPage } from "@/pages/EmployerDashboardPage";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Partner users: route through the client picker if they haven't picked
  // an active client yet. Once picked, they land in the standard case
  // dashboard for the picked client (employer-equivalent UX).
  if (user?.role === "partner") {
    if (!user.activeOrganizationId) {
      return <Navigate to="/partner/clients" replace />;
    }
    return <CasesDashboard />;
  }

  // Show employer dashboard with left sidebar navigation
  if (user?.role === "employer") {
    return <EmployerDashboardPage />;
  }

  // Default: show admin/clinician dashboard
  return <CasesDashboard />;
}
