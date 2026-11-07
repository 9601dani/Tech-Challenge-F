import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { Permission } from "../../modules/auth/types/auth.types";
import { ProtectedRoute } from "./ProtectedRoute";

interface PermissionRouteProps {
  children: ReactNode;
  permissions: Permission[];
  feature: string;
  action: "canRead" | "canEdit" | "canDelete";
}

export function PermissionRoute({ children, permissions, feature, action }: PermissionRouteProps) {
  const allowed = permissions.some((permission) => permission.feature === feature && permission.enabled && permission[action]);
  return <ProtectedRoute>{allowed ? children : <Navigate to="/" replace />}</ProtectedRoute>;
}
