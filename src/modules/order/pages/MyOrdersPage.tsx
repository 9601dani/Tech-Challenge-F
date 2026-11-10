import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import type { Permission } from "../../auth/types/auth.types";
import { getProductVariantBySku } from "../../catalog/services/catalogApi";
import { cancelMyOrder, getMyOrderById, listMyOrders, type OrderListItem } from "../services/orderApi";

interface MyOrdersPageProps {
  permissions: Permission[];
}

const labels: Record<string, string> = { DRAFT: "Carrito", PENDING_PAYMENT: "Pago iniciado", PAID: "Pagado", PREPARING: "En preparación", SHIPPED: "Despachado", DELIVERED: "Entregado", CANCELLED: "Cancelado", RETURNED: "Devuelto", PARTIALLY_RETURNED: "Devolución parcial" };
const colors: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-700", PENDING_PAYMENT: "bg-yellow-50 text-yellow-700", PAID: "bg-emerald-50 text-emerald-700", PREPARING: "bg-amber-50 text-amber-700", SHIPPED: "bg-blue-50 text-blue-700", DELIVERED: "bg-indigo-50 text-indigo-700", CANCELLED: "bg-red-50 text-red-700", RETURNED: "bg-slate-200 text-slate-700", PARTIALLY_RETURNED: "bg-orange-50 text-orange-700" };
const formatDate = (value: string | null): string => value ? new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

const escapeHtml = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function getFallbackVariantLines(productName: string, variantName: string | null): string[] {
  if (!variantName || variantName === "Predeterminado" || variantName.trim().toLocaleLowerCase() === productName.trim().toLocaleLowerCase()) return [];
  const sizeMatch = variantName.trim().match(/^(.*?)(?:\s+talla\s+)(XXXL|XXL|XL|XS|L|M|S)$/i);
  return sizeMatch ? [sizeMatch[1].trim(), sizeMatch[2].toUpperCase()] : [variantName.trim()];
}

export function MyOrdersPage({ permissions }: MyOrdersPageProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const permission = permissions.find((item) => item.feature === "MYORDERS");
  const canRead = Boolean(permission?.enabled && permission.canRead);
  const canEdit = Boolean(permission?.enabled && permission.canEdit);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listMyOrders("", page).then((response) => {
      if (!active) return;
      setOrders(response.data);
      setPagination(response.pagination);
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar tus pedidos");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const displayableOrders = useMemo(() => orders.filter((order) => !(order.status === "CANCELLED" && order.total === 0)), [orders]);
  const statuses = useMemo(() => [...new Set(displayableOrders.map((order) => order.status))].sort(), [displayableOrders]);
  const filteredOrders = useMemo(() => status ? displayableOrders.filter((order) => order.status === status) : displayableOrders, [displayableOrders, status]);

  async function viewOrder(orderId: number) {
    try {
      const order = await getMyOrderById(orderId);
      const detailedItems = await Promise.all(order.items.map(async (item) => {
        try {
          const variants = await getProductVariantBySku(item.sku);
          const variant = variants.find((candidate) => candidate.id === item.variantId);
          return { item, lines: variant?.attributes?.map((attribute) => attribute.attributeValue) ?? getFallbackVariantLines(item.productName, item.variantName) };
        } catch {
          return { item, lines: getFallbackVariantLines(item.productName, item.variantName) };
        }
      }));
      const items = detailedItems.map(({ item, lines }) => `<div style="display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid #eef0ff;padding:.6rem 0;text-align:left"><span><strong>${escapeHtml(item.productName)}</strong>${lines.map((line) => `<br><small style="color:#64748b">${escapeHtml(line)}</small>`).join("")}<br><small style="color:#64748b">Cantidad: ${item.quantity}</small></span><strong>Q ${item.total.toFixed(2)}</strong></div>`).join("");
      await Swal.fire({ title: `Pedido #${order.id}`, html: `<p style="text-align:left;color:#64748b">Estado: <strong>${escapeHtml(labels[order.status] ?? order.status)}</strong><br>Total: <strong>Q ${order.total.toFixed(2)}</strong></p>${items}`, confirmButtonColor: "#2f2eaa", confirmButtonText: "Cerrar" });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo consultar el pedido"); }
  }

  async function cancelOrder(order: OrderListItem) {
    const confirmation = await Swal.fire({ title: `¿Cancelar pedido #${order.id}?`, text: "Esta acción reintegrará la existencia correspondiente.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Cancelar pedido", cancelButtonText: "Volver" });
    if (!confirmation.isConfirmed) return;
    try {
      setBusyOrderId(order.id);
      const response = await cancelMyOrder(order.id);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: response.status } : item));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo cancelar el pedido"); }
    finally { setBusyOrderId(null); }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-[#f7f7ff] py-8 sm:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#dc2626]">Historial</p>
      <h1 className="text-3xl font-black text-[#0f172a] sm:text-4xl">Mis pedidos</h1>
      <p className="mt-1 text-sm text-[#64748b]">Consulta únicamente los pedidos asociados a tu cuenta.</p>
      <section className="mt-8 overflow-hidden rounded-2xl border border-[#d9dcf4] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#eef0ff] p-5 sm:flex-row sm:items-center">
          <div><h2 className="text-lg font-black text-[#0f172a]">Historial de compras</h2><p className="mt-1 text-sm text-[#64748b]">{filteredOrders.length} pedido(s) visible(s) de {pagination.totalItems}</p></div><div className="flex flex-wrap gap-2"><button className="rounded-xl border border-[#d9dcf4] bg-white px-4 py-2.5 text-sm font-bold text-[#2f2eaa]" onClick={() => navigate("/my-orders/profile")} type="button">Mi perfil</button><button className="rounded-xl bg-[#2f2eaa] px-4 py-2.5 text-sm font-bold text-white" onClick={() => navigate("/my-orders/addresses")} type="button">Mis direcciones</button></div>
          <select className="rounded-xl border border-[#d9dcf4] bg-white px-4 py-2.5 text-sm text-[#475569] outline-none focus:border-[#2f2eaa]" onChange={(event) => { setStatus(event.target.value); setPage(1); }} value={status}>
            <option value="">Todos los estados</option>
            {statuses.map((item) => <option key={item} value={item}>{labels[item] ?? item}</option>)}
          </select>
        </div>
        {error && <p className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#fafaff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-5 py-4">Pedido</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Artículos</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-[#eef0ff]">
              {loading && <tr><td className="px-5 py-12 text-center text-[#64748b]" colSpan={6}>Cargando pedidos...</td></tr>}
              {!loading && filteredOrders.map((order) => <tr className="hover:bg-[#fafaff]" key={order.id}><td className="px-5 py-4 font-bold text-[#0f172a]">#{order.id}</td><td className="px-5 py-4 text-[#64748b]">{formatDate(order.saleDate ?? order.createdAt)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[order.status] ?? "bg-slate-100 text-slate-700"}`}>{labels[order.status] ?? order.status}</span></td><td className="px-5 py-4 text-[#64748b]">{order.totalItems ?? "—"}</td><td className="px-5 py-4 text-right font-black text-[#2f2eaa]">Q {order.total.toFixed(2)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{canRead && <button aria-label={`Ver pedido ${order.id}`} className="rounded-lg border border-[#d9dcf4] px-2.5 py-2 text-[#2f2eaa]" onClick={() => viewOrder(order.id)} title="Ver pedido" type="button">👁</button>}{canEdit && (order.status === "PAID" || order.status === "PREPARING") && <button aria-label={`Cancelar pedido ${order.id}`} className="rounded-lg border border-[#fecaca] px-2.5 py-2 text-[#dc2626]" disabled={busyOrderId === order.id} onClick={() => cancelOrder(order)} title="Cancelar pedido" type="button">🗑</button>}</div></td></tr>)}
              {!loading && filteredOrders.length === 0 && <tr><td className="px-5 py-12 text-center text-[#64748b]" colSpan={6}>No tienes pedidos para mostrar.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#eef0ff] p-5 text-sm text-[#64748b]"><span>Página {pagination.page} de {Math.max(pagination.totalPages, 1)}</span><div className="flex gap-2"><button className="rounded-lg border border-[#d9dcf4] px-3 py-2 text-[#2f2eaa] disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} type="button">Anterior</button><button className="rounded-lg border border-[#d9dcf4] px-3 py-2 text-[#2f2eaa] disabled:opacity-40" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} type="button">Siguiente</button></div></div>
      </section>
    </main>
  );
}
