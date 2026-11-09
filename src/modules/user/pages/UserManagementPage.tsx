import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import type { Permission } from "../../auth/types/auth.types";
import { createUser, deactivateUser, getUser, listUserBranches, listUserCompanies, listUserRoles, listUsers, reactivateUser, updateUser, type ManagedUser, type UserBranch, type UserCompany, type UserRole } from "../services/userApi";
import { useNavigate } from "react-router-dom";

interface Props { permissions: Permission[]; }
interface Form { companyId: string; branchId: string; email: string; fullName: string; password: string; roleId: string; }
const emptyForm: Form = { companyId: "", branchId: "", email: "", fullName: "", password: "", roleId: "" };

export function UserManagementPage({ permissions }: Props) {
  const navigate = useNavigate();
  const canEdit = permissions.some((permission) => permission.feature === "USERS" && permission.enabled && permission.canEdit);
  const canDelete = permissions.some((permission) => permission.feature === "USERS" && permission.enabled && permission.canDelete);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [branches, setBranches] = useState<UserBranch[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() { setLoading(true); try { const response = await listUsers(search); setUsers(response.data ?? []); } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los usuarios"); } finally { setLoading(false); } }
  useEffect(() => { void Promise.all([loadUsers(), listUserCompanies().then(setCompanies), listUserRoles().then(setRoles)]).catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los catálogos")); }, [search]);

  async function selectCompany(companyId: string) { setForm((current) => ({ ...current, companyId, branchId: "" })); setBranches(companyId ? await listUserBranches(Number(companyId)) : []); }
  function updateField(field: keyof Form, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function reset() { setForm(emptyForm); setBranches([]); setEditingId(null); setError(""); }

  async function startEdit(user: ManagedUser) {
    try {
      const detail = await getUser(user.idUser);
      const nextBranches = await listUserBranches(detail.companyId);
      setBranches(nextBranches);
      setEditingId(user.idUser);
      setForm({ companyId: String(detail.companyId), branchId: String(detail.branchId), email: detail.email, fullName: detail.fullName, password: "", roleId: String(detail.roleId) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el usuario"); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!form.companyId || !form.branchId || !form.roleId || !form.email || !form.fullName || (!editingId && !form.password)) { setError("Completa todos los campos obligatorios."); return; }
    setSaving(true);
    try {
      const input = { companyId: Number(form.companyId), branchId: Number(form.branchId), email: form.email.trim(), fullName: form.fullName.trim(), roleId: Number(form.roleId), ...(form.password ? { password: form.password } : {}) };
      if (editingId) await updateUser(editingId, input); else await createUser(input);
      await Swal.fire({ icon: "success", title: editingId ? "Usuario actualizado" : "Usuario creado", confirmButtonColor: "#2f2eaa" });
      reset(); await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el usuario"); } finally { setSaving(false); }
  }

  async function changeActive(user: ManagedUser) {
    const result = await Swal.fire({ icon: "warning", title: user.active ? "¿Desactivar usuario?" : "¿Reactivar usuario?", text: user.active ? "El usuario no podrá iniciar sesión." : "El usuario podrá volver a iniciar sesión.", showCancelButton: true, confirmButtonColor: user.active ? "#dc2626" : "#2f2eaa", confirmButtonText: user.active ? "Desactivar" : "Reactivar", cancelButtonText: "Cancelar" });
    if (!result.isConfirmed) return;
    try { if (user.active) await deactivateUser(user.idUser); else await reactivateUser(user.idUser); await loadUsers(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el estado del usuario"); }
  }

  const displayedUsers = showInactive ? users : users.filter((user) => user.active);
  return <main className="min-h-[calc(100vh-73px)] bg-[#f7f7ff] px-4 py-6 text-[#0f172a] sm:px-6 lg:px-8">
    <button className="mb-5 rounded-lg bg-[#2f2eaa] px-4 py-2 font-bold text-white" onClick={() => navigate("/users/roles")} type="button">Administrar roles y permisos</button>
    {canEdit && <section className="rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dc2626]">Administración</p><h1 className="mt-1 text-2xl font-black">{editingId ? "Editar usuario" : "Nuevo usuario"}</h1></div>{editingId && <button className="rounded-lg border border-[#d9dcf4] px-4 py-2 font-bold text-[#2f2eaa]" onClick={reset} type="button">Cancelar</button>}</div><form className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={submit}><label className="text-sm font-semibold">Nombre completo<input className="field mt-1 w-full" onChange={(e) => updateField("fullName", e.target.value)} value={form.fullName} /></label><label className="text-sm font-semibold">Correo<input className="field mt-1 w-full" onChange={(e) => updateField("email", e.target.value)} type="email" value={form.email} /></label><label className="text-sm font-semibold">Contraseña{editingId && <span className="text-xs font-normal"> (opcional)</span>}<input className="field mt-1 w-full" minLength={8} onChange={(e) => updateField("password", e.target.value)} type="password" value={form.password} /></label><label className="text-sm font-semibold">Empresa<select className="field mt-1 w-full" onChange={(e) => void selectCompany(e.target.value)} value={form.companyId}><option value="">Seleccionar empresa</option>{companies.map((company) => <option key={company.idCompany} value={company.idCompany}>{company.name}</option>)}</select></label><label className="text-sm font-semibold">Sucursal<select className="field mt-1 w-full" onChange={(e) => updateField("branchId", e.target.value)} value={form.branchId}><option value="">Seleccionar sucursal</option>{branches.map((branch) => <option key={branch.idBranch} value={branch.idBranch}>{branch.name}</option>)}</select></label><label className="text-sm font-semibold">Rol<select className="field mt-1 w-full" onChange={(e) => updateField("roleId", e.target.value)} value={form.roleId}><option value="">Seleccionar rol</option>{roles.map((role) => <option key={role.idRole} value={role.idRole}>{role.name}</option>)}</select></label><button className="rounded-xl bg-[#2f2eaa] px-4 py-3 font-bold text-white disabled:opacity-60 md:col-span-2 lg:col-span-1" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear usuario"}</button></form>{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}</section>}
    <section className="mt-6 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dc2626]">Usuarios</p><h2 className="text-2xl font-black">Usuarios registrados</h2></div><div className="flex gap-3"><input className="field" onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuario" value={search} /><label className="flex items-center gap-2 text-sm font-semibold"><input checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} type="checkbox" /> Inactivos</label></div></div>{loading ? <p className="py-10 text-center text-[#64748b]">Cargando usuarios...</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-[#eef0ff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-3 py-3">Usuario</th><th className="px-3 py-3">Empresa</th><th className="px-3 py-3">Sucursal</th><th className="px-3 py-3">Rol</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead><tbody>{displayedUsers.map((user) => <tr className="border-b border-[#f0f1fa]" key={user.idUser}><td className="px-3 py-4"><p className="font-bold">{user.fullName}</p><p className="text-xs text-[#64748b]">{user.email}</p></td><td className="px-3 py-4">{user.companyName}</td><td className="px-3 py-4">{user.branchName}</td><td className="px-3 py-4">{user.roles ?? "Sin rol"}</td><td className="px-3 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.active ? "Activo" : "Inactivo"}</span></td><td className="px-3 py-4"><div className="flex gap-2">{canEdit && user.active && <button className="rounded-lg bg-[#eef0ff] px-3 py-2 font-bold text-[#2f2eaa]" onClick={() => void startEdit(user)} type="button">Editar</button>}{canDelete && <button className={`rounded-lg px-3 py-2 font-bold ${user.active ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`} onClick={() => void changeActive(user)} type="button">{user.active ? "Desactivar" : "Reactivar"}</button>}</div></td></tr>)}</tbody></table>{!displayedUsers.length && <p className="py-10 text-center text-[#64748b]">No hay usuarios para mostrar.</p>}</div>}</section>
  </main>;
}
