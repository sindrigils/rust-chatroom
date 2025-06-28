import { useAuth } from "@hooks/auth-context";
import { Navigate, Outlet } from "react-router-dom";

export function PublicLayout() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/create" replace />;
  }
  return <Outlet />;
}
