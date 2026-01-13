import { useAuth } from "@/hooks/useAuth";
import GPNet2Dashboard from "@/pages/GPNet2Dashboard";
import { EmployerSummaryDashboard } from "@/components/EmployerSummaryDashboard";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Show new employer summary dashboard for employer role
  if (user?.role === "employer") {
    return <EmployerSummaryDashboard />;
  }

  // Default: show admin/clinician dashboard
  return <GPNet2Dashboard />;
}
