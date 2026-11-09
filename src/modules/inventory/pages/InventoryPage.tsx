import { useEffect, useMemo, useState } from "react";
import { getInventoryKardex, listInventoryStock, registerInventoryMovement, type InventoryMovementItem, type InventoryMovementType, type InventoryStockItem } from "../services/inventoryApi";

const movementLabels: Record<string, string> = { ENTRY: "Entrada", SALE: "Venta", ADJUSTMENT: "Ajuste", RETURN: "Devolución", RESERVATION: "Reserva", RELEASE: "Liberación", CONSUMPTION: "Consumo" };

const formatDate = (value: string) => new Date(value).toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });

interface InventoryPageProps { canEdit: boolean; }

export function InventoryPage({ canEdit }: InventoryPageProps) {
  const [stock, setStock] = useState<InventoryStockItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [selected, setSelected] = useState<InventoryStockItem | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [error, setError] = useState("");
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState<InventoryMovementType>("ENTRY");
  const [movementVariantId, setMovementVariantId] = useState("");
  const [movementWarehouseId, setMovementWarehouseId] = useState("");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [savingMovement, setSavingMovement] = useState(false);

  useEffect(() => {
    void listInventoryStock().then(setStock).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el inventario")).finally(() => setLoading(false));
  }, []);

  const filteredStock = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return stock.filter((item) => !normalized || item.sku.toLocaleLowerCase().includes(normalized) || (item.variantName ?? "").toLocaleLowerCase().includes(normalized));
  }, [search, stock]);

  async function selectVariant(item: InventoryStockItem) {
    setSelected(item);
    setLoadingKardex(true);
    setError("");
    try { setMovements(await getInventoryKardex(item.variantId, item.warehouseId)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el kardex"); }
    finally { setLoadingKardex(false); }
  }

  function openMovementForm() {
    const first = selected ?? stock[0];
    setMovementVariantId(first ? String(first.variantId) : "");
    setMovementWarehouseId(first ? String(first.warehouseId) : "");
    setShowMovementForm(true);
  }

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(movementQuantity);
    const parsedUnitCost = unitCost === "" ? undefined : Number(unitCost);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (parsedUnitCost !== undefined && (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0)) {
      setError("El costo unitario no puede ser negativo.");
      return;
    }
    setSavingMovement(true);
    setError("");
    try {
      await registerInventoryMovement({ movementType, variantId: Number(movementVariantId), warehouseId: Number(movementWarehouseId), quantity: parsedQuantity, reason: movementReason, ...(movementType === "ENTRY" && parsedUnitCost !== undefined ? { unitCost: parsedUnitCost } : {}) });
      const refreshed = await listInventoryStock();
      setStock(refreshed);
      const updated = refreshed.find((item) => item.variantId === Number(movementVariantId) && item.warehouseId === Number(movementWarehouseId));
      if (updated) await selectVariant(updated);
      setMovementQuantity("");
      setMovementReason("");
      setUnitCost("");
      setShowMovementForm(false);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo registrar el movimiento"); }
    finally { setSavingMovement(false); }
  }

  return <main className="min-h-[calc(100vh-73px)] bg-[#f7f7ff] px-4 py-6 text-[#0f172a] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#dc2626]">Inventario</p><h1 className="mt-2 text-3xl font-black">Kardex de existencias</h1><p className="mt-1 text-sm text-[#64748b]">Consulta la existencia física, las reservas y los movimientos registrados por variante.</p></div>{canEdit && <button className="rounded-xl bg-[#3b49b6] px-5 py-3 font-bold text-white hover:bg-[#2f3ca0]" onClick={openMovementForm} type="button">+ Nuevo movimiento</button>}</div>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {canEdit && showMovementForm && <form className="mb-5 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm" onSubmit={(event) => void submitMovement(event)}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Registrar ingreso o egreso</h2><button className="text-sm font-bold text-[#64748b]" onClick={() => setShowMovementForm(false)} type="button">Cancelar</button></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-bold">Movimiento<select className="field mt-2 w-full" onChange={(event) => setMovementType(event.target.value as InventoryMovementType)} value={movementType}><option value="ENTRY">Ingreso</option><option value="EXIT">Egreso</option></select></label><label className="text-sm font-bold">Variante<select className="field mt-2 w-full" onChange={(event) => setMovementVariantId(event.target.value)} required value={movementVariantId}><option value="">Selecciona una variante</option>{stock.map((item) => <option key={`${item.variantId}-${item.warehouseId}`} value={item.variantId}>{item.sku} · {item.variantName ?? "Sin nombre"}</option>)}</select></label><label className="text-sm font-bold">Bodega<select className="field mt-2 w-full" onChange={(event) => setMovementWarehouseId(event.target.value)} required value={movementWarehouseId}><option value="">Selecciona una bodega</option>{Array.from(new Map(stock.map((item) => [item.warehouseId, item])).values()).map((item) => <option key={item.warehouseId} value={item.warehouseId}>Bodega #{item.warehouseId}</option>)}</select></label><label className="text-sm font-bold">Cantidad<input className="field mt-2 w-full" min="0.001" required step="0.001" type="number" onChange={(event) => setMovementQuantity(event.target.value.replace(/-/g, ""))} onKeyDown={(event) => { if (["-", "+", "e", "E"].includes(event.key)) event.preventDefault(); }} value={movementQuantity} /></label>{movementType === "ENTRY" && <label className="text-sm font-bold">Costo unitario <span className="font-normal text-[#64748b]">(opcional)</span><input className="field mt-2 w-full" min="0" step="0.01" type="number" onChange={(event) => setUnitCost(event.target.value.replace(/-/g, ""))} onKeyDown={(event) => { if (["-", "+", "e", "E"].includes(event.key)) event.preventDefault(); }} value={unitCost} /></label>}<label className="text-sm font-bold md:col-span-2 lg:col-span-3">Razón del movimiento<textarea className="field mt-2 min-h-24 w-full" maxLength={1000} onChange={(event) => setMovementReason(event.target.value)} placeholder="Ej. Compra de proveedor, producto dañado, ajuste de conteo físico..." required value={movementReason} /></label></div><button className="mt-4 rounded-xl bg-[#3b49b6] px-5 py-3 font-bold text-white disabled:opacity-50" disabled={savingMovement} type="submit">{savingMovement ? "Guardando..." : "Registrar movimiento"}</button></form>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <section className="rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Existencias</h2><input className="field max-w-xs" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar SKU o variante" value={search} /></div>{loading ? <p className="py-10 text-center text-[#64748b]">Cargando inventario...</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[#eef0ff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-3 py-3">Producto</th><th className="px-3 py-3">Bodega</th><th className="px-3 py-3">Física</th><th className="px-3 py-3">Reservada</th><th className="px-3 py-3">Disponible</th></tr></thead><tbody>{filteredStock.map((item) => <tr className={`cursor-pointer border-b border-[#f0f1fa] hover:bg-[#fafaff] ${selected?.variantId === item.variantId && selected.warehouseId === item.warehouseId ? "bg-[#eef0ff]" : ""}`} key={`${item.variantId}-${item.warehouseId}`} onClick={() => void selectVariant(item)}><td className="px-3 py-4"><p className="font-bold">{item.variantName ?? "Sin nombre"}</p><p className="text-xs text-[#64748b]">{item.sku}</p></td><td className="px-3 py-4">#{item.warehouseId}</td><td className="px-3 py-4">{item.physicalQuantity}</td><td className="px-3 py-4">{item.reservedQuantity}</td><td className="px-3 py-4 font-black text-[#2f2eaa]">{item.availableQuantity}</td></tr>)}</tbody></table>{!filteredStock.length && <p className="py-10 text-center text-[#64748b]">No hay existencias para mostrar.</p>}</div>}</section>
        <section className="rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><div className="border-b border-[#eef0ff] pb-4"><h2 className="text-xl font-black">Kardex</h2><p className="mt-1 text-sm text-[#64748b]">{selected ? `${selected.variantName ?? "Variante"} · ${selected.sku}` : "Selecciona una variante para consultar sus movimientos."}</p></div>{loadingKardex ? <p className="py-10 text-center text-[#64748b]">Cargando movimientos...</p> : !selected ? <p className="py-16 text-center text-[#64748b]">Selecciona una existencia del listado.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-[#eef0ff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Movimiento</th><th className="px-3 py-3">Cantidad</th><th className="px-3 py-3">Motivo</th><th className="px-3 py-3">Referencia</th></tr></thead><tbody>{movements.map((movement) => <tr className="border-b border-[#f0f1fa]" key={movement.id}><td className="px-3 py-4 text-xs text-[#64748b]">{formatDate(movement.createdAt)}</td><td className="px-3 py-4"><span className="rounded-full bg-[#eef0ff] px-2 py-1 text-xs font-bold text-[#2f2eaa]">{movementLabels[movement.movementType] ?? movement.movementType}</span></td><td className="px-3 py-4 font-black">{movement.quantity}</td><td className="px-3 py-4">{movement.reason}</td><td className="px-3 py-4 text-xs text-[#64748b]">{movement.referenceType ? `${movement.referenceType} #${movement.referenceId ?? "—"}` : "—"}</td></tr>)}</tbody></table>{!movements.length && <p className="py-10 text-center text-[#64748b]">No hay movimientos registrados.</p>}</div>}</section>
      </div>
    </div>
  </main>;
}
