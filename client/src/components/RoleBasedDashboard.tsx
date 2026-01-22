import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GPNet2Dashboard from "@/pages/GPNet2Dashboard";

export function RoleBasedDashboard() {
  const { user } = useAuth();

  // Employer users get left sidebar navigation via /cases route
  if (user?.role === "employer") {
    return <Navigate to="/cases" replace />;
  }

  // Default: show admin/clinician dashboard
  return <GPNet2Dashboard />;
}
