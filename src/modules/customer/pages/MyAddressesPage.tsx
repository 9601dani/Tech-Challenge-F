import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useNavigate } from "react-router-dom";
import type { Permission } from "../../auth/types/auth.types";
import { createMyAddress, deleteMyAddress, listMyAddresses, updateMyAddress, type CustomerAddress, type CustomerAddressInput } from "../services/customerApi";

interface MyAddressesPageProps {
  permissions: Permission[];
}

const emptyForm: CustomerAddressInput = {
  alias: "",
  addressLine: "",
  department: "",
  municipality: "",
  postalCode: "",
  countryCode: "GT",
  isDefault: false,
};

export function MyAddressesPage({ permissions }: MyAddressesPageProps) {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [form, setForm] = useState<CustomerAddressInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const customerPermission = permissions.find((permission) => permission.feature === "CUSTOMERS");
  const canEdit = Boolean(customerPermission?.enabled && customerPermission.canEdit);

  async function loadAddresses() {
    setLoading(true);
    try {
      setAddresses(await listMyAddresses());
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar tus direcciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAddresses(); }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editAddress(address: CustomerAddress) {
    setEditingId(address.id);
    setForm({
      alias: address.alias ?? "",
      addressLine: address.addressLine,
      department: address.department ?? "",
      municipality: address.municipality ?? "",
      postalCode: address.postalCode ?? "",
      countryCode: address.countryCode,
      isDefault: address.isDefault,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.addressLine.trim()) {
      setError("La dirección es obligatoria.");
      return;
    }

    const normalizedAlias = form.alias?.trim().toLocaleLowerCase();
    if (normalizedAlias && addresses.some((address) => address.id !== editingId && (address.alias ?? "").trim().toLocaleLowerCase() === normalizedAlias)) {
      setError("Ya tienes una dirección con ese nombre o alias.");
      return;
    }

    try {
      setSaving(true);
      const input = { ...form, alias: form.alias?.trim(), addressLine: form.addressLine.trim(), department: form.department?.trim(), municipality: form.municipality?.trim(), postalCode: form.postalCode?.trim() };
      if (editingId) await updateMyAddress(editingId, input);
      else await createMyAddress(input);
      await Swal.fire({ icon: "success", title: editingId ? "Dirección actualizada" : "Dirección creada", confirmButtonColor: "#2f2eaa" });
      resetForm();
      await loadAddresses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la dirección");
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(address: CustomerAddress) {
    const confirmation = await Swal.fire({ title: "¿Eliminar dirección?", text: `La dirección ${address.alias || address.addressLine} se eliminará de tus direcciones disponibles.`, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" });
    if (!confirmation.isConfirmed) return;
    try {
      await deleteMyAddress(address.id);
      await loadAddresses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo desactivar la dirección");
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-[#f7f7ff] py-8 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[0.25em] text-[#dc2626]">Perfil</p><h1 className="text-3xl font-black text-[#0f172a] sm:text-4xl">Mis direcciones</h1><p className="mt-1 text-sm text-[#64748b]">Administra los destinos disponibles para tus pedidos.</p></div>
        <button className="rounded-xl border border-[#d9dcf4] bg-white px-4 py-3 text-sm font-bold text-[#2f2eaa]" onClick={() => navigate("/my-orders")} type="button">← Regresar a mis pedidos</button>
      </div>

      {canEdit && <section className="mt-8 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-black">{editingId ? "Editar dirección" : "Nueva dirección"}</h2>{editingId && <button className="text-sm font-bold text-[#64748b]" onClick={resetForm} type="button">Cancelar edición</button>}</div><form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event)}><label className="text-sm font-semibold">Alias<input className="field" onChange={(event) => setForm((current) => ({ ...current, alias: event.target.value }))} placeholder="Casa, trabajo..." value={form.alias ?? ""} /></label><label className="text-sm font-semibold">País<input className="field" onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))} maxLength={2} value={form.countryCode} /></label><label className="text-sm font-semibold md:col-span-2">Dirección<input className="field" onChange={(event) => setForm((current) => ({ ...current, addressLine: event.target.value }))} required value={form.addressLine} /></label><label className="text-sm font-semibold">Departamento<input className="field" onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} value={form.department ?? ""} /></label><label className="text-sm font-semibold">Municipio<input className="field" onChange={(event) => setForm((current) => ({ ...current, municipality: event.target.value }))} value={form.municipality ?? ""} /></label><label className="text-sm font-semibold">Código postal<input className="field" onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))} value={form.postalCode ?? ""} /></label><label className="flex items-center gap-2 text-sm font-semibold"><input checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} type="checkbox" /> Usar como dirección predeterminada</label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">{error}</p>}<button className="w-fit rounded-xl bg-[#2f2eaa] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear dirección"}</button></form></section>}

      <section className="mt-8 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Direcciones guardadas</h2>{!canEdit && error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{loading ? <p className="py-10 text-center text-[#64748b]">Cargando direcciones...</p> : addresses.length === 0 ? <p className="py-10 text-center text-[#64748b]">No tienes direcciones guardadas.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{addresses.map((address) => <article className="rounded-xl border border-[#e4e6f5] bg-[#fafaff] p-4" key={address.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[#0f172a]">{address.alias || "Dirección"}</h3><p className="mt-2 text-sm text-[#475569]">{address.addressLine}</p><p className="text-sm text-[#64748b]">{[address.municipality, address.department, address.postalCode].filter(Boolean).join(", ")}</p><p className="mt-2 text-xs font-bold uppercase text-[#64748b]">{address.countryCode}{address.isDefault ? " · Predeterminada" : ""}</p></div><div className="flex gap-2">{canEdit && <button className="rounded-lg bg-[#eef0ff] px-3 py-2 text-sm font-bold text-[#2f2eaa]" onClick={() => editAddress(address)} type="button">Editar</button>}<button className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700" onClick={() => void removeAddress(address)} type="button">Eliminar</button></div></div></article>)}</div>}</section>
    </main>
  );
}
