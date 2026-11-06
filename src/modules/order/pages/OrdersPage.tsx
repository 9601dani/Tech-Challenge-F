import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import type { Permission } from "../../auth/types/auth.types";
import { cancelOrder, changeOrderStatus, getOrderById, listOrders, type OrderListItem } from "../services/orderApi";

interface OrdersPageProps {
  permissions: Permission[];
}

const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmado",
  PAID: "Pagado",
  PREPARING: "En preparación",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  RETURNED: "Devuelto",
  PARTIALLY_RETURNED: "Devuelto parcialmente",
};

const statusStyle: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PREPARING: "bg-amber-50 text-amber-700",
  SHIPPED: "bg-blue-50 text-blue-700",
  DELIVERED: "bg-indigo-50 text-indigo-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-slate-100 text-slate-700",
  PARTIALLY_RETURNED: "bg-orange-50 text-orange-700",
  CONFIRMED: "bg-violet-50 text-violet-700",
};

const formatDate = (value: string | null): string => value
  ? new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "—";

const formatCurrency = (value: number): string => `Q ${value.toFixed(2)}`;

const nextStatus: Record<string, string> = {
  PAID: "PREPARING",
  PREPARING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export function OrdersPage({ permissions }: OrdersPageProps) {
  const [receivedOrders, setReceivedOrders] = useState<OrderListItem[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  const orderPermission = permissions.find((permission) => permission.feature === "ORDERS");
  const canRead = Boolean(orderPermission?.enabled && orderPermission.canRead);
  const canEdit = Boolean(orderPermission?.enabled && orderPermission.canEdit);
  const canDelete = Boolean(orderPermission?.enabled && orderPermission.canDelete);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    listOrders("", page)
      .then((response) => {
        if (!active) return;
        setReceivedOrders(response.data);
        setPagination(response.pagination);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los pedidos");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  const displayableOrders = useMemo(
    () => receivedOrders.filter((order) => !(order.status === "CANCELLED" && order.total === 0)),
    [receivedOrders],
  );
  const availableStatuses = useMemo(() => [...new Set(displayableOrders.map((order) => order.status))].sort(), [displayableOrders]);
  const filteredOrders = useMemo(
    () => status ? displayableOrders.filter((order) => order.status === status) : displayableOrders,
    [displayableOrders, status],
  );

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  async function viewOrder(orderId: number) {
    try {
      const order = await getOrderById(orderId);
      const items = order.items.length > 0
        ? order.items.map((item) => `<div style="display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid #eef0ff;padding:.6rem 0;text-align:left"><span>${escapeHtml(item.productName)} x ${item.quantity}</span><strong>Q ${item.total.toFixed(2)}</strong></div>`).join("")
        : "<p>No hay líneas para mostrar.</p>";

      await Swal.fire({
        title: `Pedido #${order.id}`,
        html: `<div style="color:#64748b;text-align:left;margin-bottom:1rem">Estado: <strong>${escapeHtml(statusLabel[order.status] ?? order.status)}</strong><br>Total: <strong>Q ${order.total.toFixed(2)}</strong></div>${items}`,
        confirmButtonColor: "#2f2eaa",
        confirmButtonText: "Cerrar",
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo consultar el pedido");
    }
  }

  async function updateStatus(order: OrderListItem, targetStatus: string, cancellation = false) {
    const confirmation = await Swal.fire({
      title: `¿Cambiar pedido #${order.id}?`,
      text: `${statusLabel[order.status] ?? order.status} → ${statusLabel[targetStatus] ?? targetStatus}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2f2eaa",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmation.isConfirmed) return;

    try {
      setBusyOrderId(order.id);
      const response = cancellation ? await cancelOrder(order.id) : await changeOrderStatus(order.id, targetStatus);
      setReceivedOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: response.status } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar el estado del pedido");
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-[#f7f7ff] px-0 py-8 sm:py-10">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#dc2626]">Gestión</p>
        <h1 className="text-3xl font-black text-[#0f172a] sm:text-4xl">Pedidos</h1>
        <p className="mt-1 text-sm text-[#64748b]">Consulta el estado y el resumen de los pedidos.</p>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-[#d9dcf4] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#eef0ff] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-[#0f172a]">Listado de pedidos</h2>
            <p className="mt-1 text-sm text-[#64748b]">{filteredOrders.length} pedido(s) visible(s) de {pagination.totalItems}</p>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-[#475569]">
            Estado
            <select className="rounded-xl border border-[#d9dcf4] bg-white px-4 py-2.5 font-normal outline-none focus:border-[#2f2eaa]" onChange={(event) => handleStatusChange(event.target.value)} value={status}>
              <option value="">Todos</option>
              {availableStatuses.map((availableStatus) => <option key={availableStatus} value={availableStatus}>{statusLabel[availableStatus] ?? availableStatus}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-[#fafaff] text-xs uppercase tracking-wider text-[#64748b]">
              <tr>
                <th className="px-5 py-4 font-bold">Pedido</th>
                <th className="px-5 py-4 font-bold">Fecha</th>
                <th className="px-5 py-4 font-bold">Estado</th>
                <th className="px-5 py-4 font-bold">Artículos</th>
                <th className="px-5 py-4 text-right font-bold">Total</th>
                <th className="px-5 py-4 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ff]">
              {loading && <tr><td className="px-5 py-12 text-center text-[#64748b]" colSpan={6}>Cargando pedidos...</td></tr>}
              {!loading && filteredOrders.map((order) => (
                <tr className="transition hover:bg-[#fafaff]" key={order.id}>
                  <td className="px-5 py-4 font-bold text-[#0f172a]">#{order.id}</td>
                  <td className="px-5 py-4 text-[#64748b]">{formatDate(order.saleDate ?? order.createdAt)}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[order.status] ?? "bg-slate-100 text-slate-700"}`}>{statusLabel[order.status] ?? order.status}</span></td>
                  <td className="px-5 py-4 text-[#64748b]">{order.totalItems ?? "—"}</td>
                  <td className="px-5 py-4 text-right font-black text-[#2f2eaa]">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {canRead && <button aria-label={`Ver pedido ${order.id}`} className="rounded-lg border border-[#d9dcf4] px-2.5 py-2 text-[#2f2eaa] transition hover:bg-[#eef0ff]" onClick={() => viewOrder(order.id)} title="Ver pedido" type="button">👁</button>}
                      {canEdit && nextStatus[order.status] && <button className="rounded-lg bg-[#2f2eaa] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#25248e] disabled:opacity-50" disabled={busyOrderId === order.id} onClick={() => updateStatus(order, nextStatus[order.status])} type="button">{busyOrderId === order.id ? "..." : statusLabel[nextStatus[order.status]]}</button>}
                      {canDelete && (order.status === "PAID" || order.status === "PREPARING") && <button aria-label={`Cancelar pedido ${order.id}`} className="rounded-lg border border-[#fecaca] px-2.5 py-2 text-[#dc2626] transition hover:bg-[#fef2f2]" onClick={() => updateStatus(order, "CANCELLED", true)} title="Cancelar pedido" type="button">🗑</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredOrders.length === 0 && <tr><td className="px-5 py-12 text-center text-[#64748b]" colSpan={6}>No hay pedidos para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eef0ff] p-5 text-sm text-[#64748b] sm:flex-row sm:items-center sm:justify-between">
          <span>Página {pagination.page} de {Math.max(pagination.totalPages, 1)}</span>
          <div className="flex gap-2">
            <button className="rounded-lg border border-[#d9dcf4] px-3 py-2 font-semibold text-[#2f2eaa] disabled:cursor-not-allowed disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} type="button">Anterior</button>
            <button className="rounded-lg border border-[#d9dcf4] px-3 py-2 font-semibold text-[#2f2eaa] disabled:cursor-not-allowed disabled:opacity-40" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} type="button">Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  );
}
