import { useAuth } from "@/hooks/useAuth";
import GPNet2Dashboard from "@/pages/GPNet2Dashboard";
import EmployerDashboard from "@/pages/EmployerDashboard";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Show employer dashboard for employer role
  if (user?.role === "employer") {
    return <EmployerDashboard />;
  }

  // Default: show admin/clinician dashboard
  return <GPNet2Dashboard />;
}
