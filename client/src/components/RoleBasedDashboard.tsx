import { useAuth } from "@/hooks/useAuth";
import CasesDashboard from "@/pages/CasesDashboard";
import { EmployerDashboardPage } from "@/pages/EmployerDashboardPage";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Show employer dashboard with left sidebar navigation
  if (user?.role === "employer") {
    return <EmployerDashboardPage />;
  }

  // Default: show admin/clinician dashboard
  return <CasesDashboard />;
}
