import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import type { Permission } from "../../auth/types/auth.types";
import { getMyCustomer, updateMyCustomer, type CustomerInput } from "../services/customerApi";

export function MyProfilePage({ permissions }: { permissions: Permission[] }) {
  const navigate = useNavigate();
  const customerPermission = permissions.find((permission) => permission.feature === "CUSTOMERS");
  const canEdit = Boolean(customerPermission?.enabled && customerPermission.canEdit);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerInput>({ identification: "", name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyCustomer().then((customer) => {
      if (!customer) { setError("No se encontró información fiscal para tu usuario."); return; }
      setCustomerId(customer.id);
      setForm({ identification: customer.identification ?? "", name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "" });
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el perfil")).finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId || !form.identification.trim() || !form.name.trim()) { setError("La identificación y el nombre son obligatorios."); return; }
    setSaving(true);
    try {
      await updateMyCustomer(customerId, { ...form, identification: form.identification.trim().toUpperCase(), name: form.name.trim(), email: form.email?.trim(), phone: form.phone?.trim() });
      await Swal.fire({ icon: "success", title: "Perfil actualizado", confirmButtonColor: "#2f2eaa" });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el perfil"); }
    finally { setSaving(false); }
  }

  return <main className="min-h-[calc(100vh-73px)] w-full bg-[#f7f7ff] py-8 sm:py-10"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.25em] text-[#dc2626]">Perfil</p><h1 className="text-3xl font-black text-[#0f172a] sm:text-4xl">Mi perfil</h1><p className="mt-1 text-sm text-[#64748b]">Administra tus datos fiscales como cliente.</p></div><button className="rounded-xl border border-[#d9dcf4] bg-white px-4 py-3 text-sm font-bold text-[#2f2eaa]" onClick={() => navigate("/my-orders")} type="button">← Regresar a mis pedidos</button></div><section className="mt-8 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Información fiscal</h2>{loading ? <p className="py-10 text-center text-[#64748b]">Cargando perfil...</p> : <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event)}><label className="text-sm font-semibold">Identificación<input className="field" disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, identification: event.target.value }))} value={form.identification} /></label><label className="text-sm font-semibold">Nombre completo<input className="field" disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} /></label><label className="text-sm font-semibold">Correo electrónico<input className="field" disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" value={form.email ?? ""} /></label><label className="text-sm font-semibold">Teléfono<input className="field" disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone ?? ""} /></label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">{error}</p>}{canEdit && <button className="w-fit rounded-xl bg-[#2f2eaa] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Guardando..." : "Guardar cambios"}</button>}{!canEdit && <p className="text-sm text-[#64748b] md:col-span-2">No tienes permiso para editar la información del perfil.</p>}</form>}</section></main>;
}
