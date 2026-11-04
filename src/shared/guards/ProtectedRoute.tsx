import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

const SESSION_KEY = "shopcart.session";

interface ProtectedRouteProps {
  children: ReactNode;
}

function hasSession(): boolean {
  const rawSession = sessionStorage.getItem(SESSION_KEY);
  if (!rawSession) return false;

  try {
    const session = JSON.parse(rawSession) as { accessToken?: string };
    return Boolean(session.accessToken);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!hasSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
