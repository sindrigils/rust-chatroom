import { useAuth } from "@hooks/auth-context";
import { Outlet, Navigate, useLocation } from "react-router-dom";

export function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
