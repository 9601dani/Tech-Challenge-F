import { httpRequest } from "../../../shared/services/httpClient";

export interface ManagedUser {
  idUser: number;
  companyId: number;
  companyName: string;
  branchId: number;
  branchName: string;
  email: string;
  userCode: string;
  fullName: string;
  active: boolean;
  roles: string | null;
  deletedAt: string | null;
}

export interface UserCompany { idCompany: number; name: string; currency: string; active: boolean; }
export interface UserBranch { idBranch: number; idCompany: number; name: string; active: boolean; }
export interface UserRole { idRole: number; name: string; description: string | null; active: boolean; }
export interface UserFormInput { companyId: number; branchId: number; email: string; fullName: string; password?: string; roleId: number; }

interface UserListResponse { data: ManagedUser[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; }; }

export async function listUsers(search = ""): Promise<UserListResponse> {
  const query = new URLSearchParams({ page: "1", pageSize: "100", includeInactive: "true" });
  if (search.trim()) query.set("search", search.trim());
  return httpRequest<UserListResponse>(`/users?${query.toString()}`);
}

export function getUser(userId: number): Promise<ManagedUser & { roleId: number }> {
  return httpRequest<ManagedUser & { roleId: number }>(`/users/${userId}`);
}

export function listUserCompanies(): Promise<UserCompany[]> { return httpRequest<UserCompany[]>("/users/companies"); }
export function listUserBranches(companyId: number): Promise<UserBranch[]> { return httpRequest<UserBranch[]>(`/users/companies/${companyId}/branches`); }
export function listUserRoles(): Promise<UserRole[]> { return httpRequest<UserRole[]>("/users/roles"); }

export function createUser(input: UserFormInput): Promise<unknown> { return httpRequest<unknown>("/users", { method: "POST", body: JSON.stringify(input) }); }
export function updateUser(userId: number, input: UserFormInput): Promise<unknown> { return httpRequest<unknown>(`/users/${userId}`, { method: "PUT", body: JSON.stringify(input) }); }
export function deactivateUser(userId: number): Promise<void> { return httpRequest<void>(`/users/${userId}`, { method: "DELETE" }); }
export function reactivateUser(userId: number): Promise<void> { return httpRequest<void>(`/users/${userId}/reactivate`, { method: "POST" }); }
