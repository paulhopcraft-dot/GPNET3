import { useAuth } from "@/hooks/useAuth";
import GPNet2Dashboard from "@/pages/GPNet2Dashboard";
import { EmployerDashboardPage } from "@/pages/EmployerDashboardPage";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Show employer dashboard with left sidebar navigation
  if (user?.role === "employer") {
    return <EmployerDashboardPage />;
  }

  // Default: show admin/clinician dashboard
  return <GPNet2Dashboard />;
}
