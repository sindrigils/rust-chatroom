import { useAuth } from "@hooks/use-auth";
import { Navigate, Outlet } from "react-router-dom";

export function PublicLayout() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/create" replace />;
  }
  return <Outlet />;
}
