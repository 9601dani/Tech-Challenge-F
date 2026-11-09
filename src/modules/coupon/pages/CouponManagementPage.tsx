import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import type { Permission } from "../../auth/types/auth.types";
import {
  listCatalogCategories,
  type CatalogCategory,
} from "../../catalog/services/catalogApi";
import {
  createCoupon,
  deactivateCoupon,
  listCoupons,
  updateCoupon,
  type Coupon,
  type CouponInput,
} from "../services/couponApi";

interface Props {
  permissions: Permission[];
}
interface Form {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  startDate: string;
  endDate: string;
  minimumPurchase: string;
  totalUsageLimit: string;
  usageLimitPerCustomer: string;
  categoryIds: number[];
}
const emptyForm: Form = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  startDate: "",
  endDate: "",
  minimumPurchase: "0",
  totalUsageLimit: "",
  usageLimitPerCustomer: "",
  categoryIds: [],
};
const dateValue = (date: string) =>
  date ? new Date(date).toISOString().slice(0, 16) : "";

export function CouponManagementPage({ permissions }: Props) {
  const canEdit = permissions.some(
    (p) => p.feature === "COUPONS" && p.enabled && p.canEdit,
  );
  const canDelete = permissions.some(
    (p) => p.feature === "COUPONS" && p.enabled && p.canDelete,
  );
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() {
    try {
      setCoupons(await listCoupons(showInactive));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los cupones",
      );
    }
  }
  useEffect(() => {
    void load();
    void listCatalogCategories()
      .then((items) => setCategories(items.map((item) => ({ ...item, id: Number(item.id) }))))
      .catch(() => setCategories([]));
  }, [showInactive]);
  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.active && !form.categoryIds.includes(category.id),
      ),
    [categories, form.categoryIds],
  );
  function update(field: keyof Form, value: string | number[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function addCategory(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const categoryId = Number(categoryToAdd);
    if (!categoryId) return;
    const category = categories.find((item) => item.id === categoryId);
    setForm((current) => {
      if (current.categoryIds.includes(categoryId)) {
        void Swal.fire({
          icon: "info",
          title: "Categoría ya agregada",
          text: `${category?.name ?? `Categoría #${categoryId}`} ya forma parte del cupón.`,
          confirmButtonColor: "#2f2eaa",
        });
        return current;
      }
      return { ...current, categoryIds: [...current.categoryIds, categoryId] };
    });
    setCategoryToAdd("");
  }
  function removeCategory(categoryId: number) {
    update(
      "categoryIds",
      form.categoryIds.filter((id) => id !== categoryId),
    );
  }
  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setCategoryToAdd("");
    setError("");
  }
  function edit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      startDate: dateValue(coupon.startDate),
      endDate: dateValue(coupon.endDate),
      minimumPurchase: String(coupon.minimumPurchase),
      totalUsageLimit: coupon.totalUsageLimit?.toString() ?? "",
      usageLimitPerCustomer: coupon.usageLimitPerCustomer?.toString() ?? "",
      categoryIds: coupon.categoryIds,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.code || !form.discountValue || !form.startDate || !form.endDate) {
      setError("Completa los campos obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const input: CouponInput = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        minimumPurchase: Number(form.minimumPurchase || 0),
        ...(form.totalUsageLimit
          ? { totalUsageLimit: Number(form.totalUsageLimit) }
          : {}),
        ...(form.usageLimitPerCustomer
          ? { usageLimitPerCustomer: Number(form.usageLimitPerCustomer) }
          : {}),
        categoryIds: form.categoryIds,
      };
      if (editingId) await updateCoupon(editingId, input);
      else await createCoupon(input);
      await Swal.fire({
        icon: "success",
        title: editingId ? "Cupón actualizado" : "Cupón creado",
        confirmButtonColor: "#2f2eaa",
      });
      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cupón");
    } finally {
      setSaving(false);
    }
  }
  async function deactivate(coupon: Coupon) {
    const result = await Swal.fire({
      icon: "warning",
      title: "¿Desactivar cupón?",
      text: "No podrá utilizarse nuevamente.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Desactivar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deactivateCoupon(coupon.id);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo desactivar el cupón",
      );
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#f7f7ff] px-4 py-6 text-[#0f172a] sm:px-6 lg:px-8">
      {canEdit && (
        <section className="rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dc2626]">
                Promociones
              </p>
              <h1 className="text-2xl font-black">
                {editingId ? "Editar cupón" : "Nuevo cupón"}
              </h1>
            </div>
            {editingId && (
              <button
                className="h-8 w-20 rounded-md border px-1 py-1 text-xs font-bold text-[#2f2eaa]"
                onClick={reset}
                type="button"
              >
                Cancelar
              </button>
            )}
          </div>
          <form
            className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            onSubmit={submit}
          >
            <label className="text-sm font-semibold">
              Código
              <input
                className="field mt-1 w-full"
                onChange={(e) => update("code", e.target.value)}
                value={form.code}
              />
            </label>
            <label className="text-sm font-semibold">
              Tipo
              <select
                className="field mt-1 w-full"
                onChange={(e) => update("discountType", e.target.value)}
                value={form.discountType}
              >
                <option value="PERCENTAGE">Porcentaje</option>
                <option value="FIXED">Monto fijo</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Valor
              <input
                className="field mt-1 w-full"
                min="0"
                onChange={(e) => update("discountValue", e.target.value)}
                type="number"
                value={form.discountValue}
              />
            </label>
            <label className="text-sm font-semibold">
              Inicio
              <input
                className="field mt-1 w-full"
                onChange={(e) => update("startDate", e.target.value)}
                type="datetime-local"
                value={form.startDate}
              />
            </label>
            <label className="text-sm font-semibold">
              Fin
              <input
                className="field mt-1 w-full"
                onChange={(e) => update("endDate", e.target.value)}
                type="datetime-local"
                value={form.endDate}
              />
            </label>
            <label className="text-sm font-semibold">
              Compra mínima
              <input
                className="field mt-1 w-full"
                min="0"
                onChange={(e) => update("minimumPurchase", e.target.value)}
                type="number"
                value={form.minimumPurchase}
              />
            </label>
            <label className="text-sm font-semibold">
              Límite total
              <input
                className="field mt-1 w-full"
                min="1"
                onChange={(e) => update("totalUsageLimit", e.target.value)}
                type="number"
                value={form.totalUsageLimit}
              />
            </label>
            <label className="text-sm font-semibold">
              Límite por cliente
              <input
                className="field mt-1 w-full"
                min="1"
                onChange={(e) =>
                  update("usageLimitPerCustomer", e.target.value)
                }
                type="number"
                value={form.usageLimitPerCustomer}
              />
            </label>
            <div className="text-sm font-semibold lg:col-span-3">
              <span>Categorías válidas</span>
              <p className="mt-1 text-xs font-normal text-[#64748b]">
                {form.categoryIds.length === 0
                  ? "No hay categorías agregadas."
                  : "Este cupón aplica únicamente a las categorías agregadas abajo."}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  className="field flex-1"
                  onChange={(e) => setCategoryToAdd(e.target.value)}
                  value={categoryToAdd}
                >
                  <option value="">
                    Selecciona una categoría para agregar
                  </option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg bg-[#eef0ff] px-4 py-2 font-bold text-[#2f2eaa] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!categoryToAdd}
                  onClick={addCategory}
                  type="button"
                >
                  Agregar categoría
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-[#d9dcf4] bg-white p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#64748b]">
                  Categorías agregadas
                </p>
                {form.categoryIds.length === 0 ? (
                  <p className="text-sm font-normal text-[#94a3b8]">
                    La lista está vacía. Agrega una categoría usando el selector.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {form.categoryIds.map((categoryId) => {
                      const category = categories.find((item) => item.id === categoryId);
                      const categoryName = category?.name ?? `Categoría #${categoryId}`;
                      return (
                      <li
                        className="flex items-center justify-between rounded-lg bg-[#f7f7ff] px-3 py-2 text-sm font-bold text-[#2f2eaa]"
                        key={categoryId}
                      >
                        <span>{categoryName}</span>
                        <button
                          aria-label={`Quitar categoría ${categoryName}`}
                          className="rounded-md px-2 text-lg font-black leading-none text-[#dc2626] hover:bg-red-50"
                          onClick={() => removeCategory(categoryId)}
                          type="button"
                        >
                          ×
                        </button>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            <button
              className="rounded-xl bg-[#2f2eaa] px-4 py-3 font-bold text-white"
              disabled={saving}
              type="submit"
            >
              {saving ? "Guardando..." : "Guardar cupón"}
            </button>
          </form>
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
      )}
      <section className="mt-6 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dc2626]">
              Cupones
            </p>
            <h2 className="text-2xl font-black">Cupones registrados</h2>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              type="checkbox"
            />{" "}
            Mostrar inactivos
          </label>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-[#64748b]">
              <tr>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Descuento</th>
                <th className="px-3 py-3">Categorías</th>
                <th className="px-3 py-3">Vigencia</th>
                <th className="px-3 py-3">Usos</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr className="border-b border-[#f0f1fa]" key={coupon.id}>
                  <td className="px-3 py-4 font-bold">{coupon.code}</td>
                  <td className="px-3 py-4">
                    {coupon.discountType === "PERCENTAGE"
                      ? `${coupon.discountValue}%`
                      : `Q ${coupon.discountValue.toFixed(2)}`}
                  </td>
                  <td className="max-w-xs px-3 py-4">
                    {coupon.categoryIds.length === 0 ? (
                      <span className="text-[#64748b]">Todas</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {coupon.categoryIds.map((categoryId) => (
                          <span
                            className="rounded-full bg-[#f1f2ff] px-2 py-1 text-xs font-semibold text-[#2f2eaa]"
                            key={categoryId}
                          >
                            {categories.find(
                              (category) => category.id === categoryId,
                            )?.name ?? `Categoría #${categoryId}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {new Date(coupon.startDate).toLocaleDateString()} -{" "}
                    {new Date(coupon.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4">
                    {coupon.usageCount}
                    {coupon.totalUsageLimit
                      ? ` / ${coupon.totalUsageLimit}`
                      : ""}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${coupon.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {coupon.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex gap-2">
                      {canEdit && coupon.active && (
                        <button
                          className="rounded-lg bg-[#eef0ff] px-3 py-2 font-bold text-[#2f2eaa]"
                          onClick={() => edit(coupon)}
                          type="button"
                        >
                          Editar
                        </button>
                      )}
                      {canDelete && coupon.active && (
                        <button
                          className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700"
                          onClick={() => void deactivate(coupon)}
                          type="button"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
