import { httpRequest } from "../../../shared/services/httpClient";
export interface ManagedRole { idRole: number; name: string; description: string | null; active: boolean; deletedAt: string | null; }
export interface RolePermission { feature: string; enabled: boolean; canRead: boolean; canEdit: boolean; canDelete: boolean; }
export function listRoles(): Promise<ManagedRole[]> { return httpRequest<ManagedRole[]>("/roles"); }
export function createRole(input: { name: string; description?: string }): Promise<{ idRole: number }> { return httpRequest<{ idRole: number }>("/roles", { method: "POST", body: JSON.stringify(input) }); }
export function updateRole(id: number, input: { name: string; description?: string }): Promise<void> { return httpRequest<void>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(input) }); }
export function deactivateRole(id: number): Promise<void> { return httpRequest<void>(`/roles/${id}`, { method: "DELETE" }); }
export function listRolePermissions(id: number): Promise<RolePermission[]> { return httpRequest<RolePermission[]>(`/roles/${id}/permissions`); }
export function replaceRolePermissions(id: number, permissions: RolePermission[]): Promise<void> { return httpRequest<void>(`/roles/${id}/permissions`, { method: "PUT", body: JSON.stringify({ permissions }) }); }
