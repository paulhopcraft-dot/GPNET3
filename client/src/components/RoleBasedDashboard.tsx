import { useAuth } from "@/hooks/useAuth";
import GPNet2Dashboard from "@/pages/GPNet2Dashboard";
import { Navigate } from "react-router-dom";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Redirect employers to /cases page (has left sidebar via PageLayout)
  if (user?.role === "employer") {
    return <Navigate to="/cases" replace />;
  }

  // Default: show admin/clinician dashboard
  return <GPNet2Dashboard />;
}
