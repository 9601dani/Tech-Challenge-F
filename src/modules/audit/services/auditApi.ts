import { httpRequest } from "../../../shared/services/httpClient";

export interface AuditLog {
  id: number;
  companyId: number | null;
  userId: number | null;
  userEmail: string | null;
  module: string;
  entityName: string;
  entityId: number | null;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  totalItems: number;
}

export interface AuditResponse {
  data: AuditLog[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export function listAuditLogs(module = "", page = 1, pageSize = 15, fromDate = "", toDate = "", sortDirection: "ASC" | "DESC" = "DESC"): Promise<AuditResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (module) query.set("module", module);
  if (fromDate) query.set("fromDate", fromDate);
  if (toDate) query.set("toDate", toDate);
  query.set("sortDirection", sortDirection);
  return httpRequest<AuditResponse>(`/audit?${query.toString()}`);
}
