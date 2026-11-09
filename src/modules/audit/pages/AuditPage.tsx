import { useEffect, useState } from "react";
import { listAuditLogs, type AuditLog } from "../services/auditApi";

const modules = ["CATALOG", "INVENTORY", "COUPON", "ORDERS", "AUTH", "USERS", "CUSTOMER"];

const formatDate = (value: string) => new Date(value).toLocaleString("es-GT", { dateStyle: "short", timeStyle: "medium" });

function formatValue(value: string | null): string {
  if (!value) return "—";
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

function parseValue(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value) as unknown; } catch { return value; }
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function AuditValuePanel({ label, value, comparison }: { label: string; value: string | null; comparison: string | null }) {
  const parsed = parseValue(value);
  const compared = parseValue(comparison);
  const isObject = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  const comparisonObject = compared !== null && typeof compared === "object" && !Array.isArray(compared);

  if (isObject && comparisonObject) {
    const current = parsed as Record<string, unknown>;
    const other = compared as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(current), ...Object.keys(other)])];
    return <div><p className="mb-1 text-xs font-black uppercase text-[#64748b]">{label}</p><div className="max-h-64 overflow-auto rounded-lg bg-[#fafaff] p-2 text-xs">{keys.map((key) => { const changed = JSON.stringify(current[key]) !== JSON.stringify(other[key]); return <div className={`grid grid-cols-[minmax(7rem,auto)_1fr] gap-2 rounded px-2 py-1 ${changed ? "bg-amber-100 text-amber-950" : ""}`} key={key}><span className="font-bold">{key}</span><span className="break-all whitespace-pre-wrap">{displayValue(current[key])}</span></div>; })}</div></div>;
  }

  const changed = JSON.stringify(parsed) !== JSON.stringify(compared);
  return <div><p className="mb-1 text-xs font-black uppercase text-[#64748b]">{label}</p><pre className={`max-h-64 overflow-auto rounded-lg p-3 text-xs ${changed ? "bg-amber-100 text-amber-950" : "bg-[#fafaff]"}`}>{formatValue(value)}</pre></div>;
}

function actionLabel(action: string): string {
  return { CREATE: "Creación", UPDATE: "Modificación", DEACTIVATE: "Desactivación", STATUS_CHANGE: "Cambio de estado" }[action] ?? action;
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [module, setModule] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void listAuditLogs(module, page, 15, fromDate, toDate, sortDirection)
      .then((response) => { if (!cancelled) { setLogs(response.data); setPagination(response.pagination); } })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la bitácora"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [module, page, fromDate, toDate, sortDirection]);

  function changeModule(value: string) { setModule(value); setPage(1); }

  return <main className="min-h-[calc(100vh-73px)] bg-[#f7f7ff] px-4 py-6 text-[#0f172a] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#dc2626]">Auditoría</p><h1 className="mt-2 text-3xl font-black">Bitácora del sistema</h1><p className="mt-1 text-sm text-[#64748b]">Consulta las operaciones registradas. Los registros son de solo lectura.</p></div>
      <section className="overflow-hidden rounded-2xl border border-[#d9dcf4] bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-[#eef0ff] p-5"><label className="text-sm font-bold">Módulo<select className="field mt-2 min-w-48" onChange={(event) => changeModule(event.target.value)} value={module}><option value="">Todos los módulos</option>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-sm font-bold">Desde<input className="field mt-2" onChange={(event) => { setFromDate(event.target.value); setPage(1); }} type="date" value={fromDate} /></label><label className="text-sm font-bold">Hasta<input className="field mt-2" onChange={(event) => { setToDate(event.target.value); setPage(1); }} type="date" value={toDate} /></label><label className="text-sm font-bold">Orden<select className="field mt-2" onChange={(event) => { setSortDirection(event.target.value as "ASC" | "DESC"); setPage(1); }} value={sortDirection}><option value="DESC">Fecha descendente</option><option value="ASC">Fecha ascendente</option></select></label><div className="ml-auto flex items-end gap-2"><button className="rounded-lg border border-[#d9dcf4] px-3 py-2 text-sm font-bold text-[#2f2eaa] disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} type="button">Anterior</button><button className="rounded-lg border border-[#d9dcf4] px-3 py-2 text-sm font-bold text-[#2f2eaa] disabled:opacity-40" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} type="button">Siguiente</button></div><p className="w-full text-right text-sm text-[#64748b]">Página {pagination.page} de {Math.max(pagination.totalPages, 1)} · {pagination.totalItems} registro(s)</p></div>
        {error && <p className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="py-16 text-center text-[#64748b]">Cargando bitácora...</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[#fafaff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Usuario</th><th className="px-5 py-4">Módulo</th><th className="px-5 py-4">Entidad</th><th className="px-5 py-4">Acción</th><th className="px-5 py-4">Valores</th></tr></thead><tbody>{logs.map((log) => <tr className="border-b border-[#f0f1fa] align-top" key={log.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-[#64748b]">{formatDate(log.createdAt)}</td><td className="px-5 py-4">{log.userEmail ?? `Usuario #${log.userId ?? "—"}`}</td><td className="px-5 py-4"><span className="rounded-full bg-[#eef0ff] px-2.5 py-1 text-xs font-bold text-[#2f2eaa]">{log.module}</span></td><td className="px-5 py-4 font-bold">{log.entityName}{log.entityId ? ` #${log.entityId}` : ""}</td><td className="px-5 py-4">{actionLabel(log.action)}</td><td className="max-w-[620px] px-5 py-4"><details><summary className="cursor-pointer font-bold text-[#2f2eaa]">Ver valores anterior y nuevo</summary><div className="mt-3 grid gap-3 lg:grid-cols-2"><AuditValuePanel comparison={log.newValue} label="Anterior" value={log.previousValue} /><AuditValuePanel comparison={log.previousValue} label="Nuevo" value={log.newValue} /></div><p className="mt-2 text-xs text-[#92400e]">Resaltado amarillo: valor modificado.</p></details></td></tr>)}</tbody></table>{!logs.length && <p className="py-12 text-center text-[#64748b]">No hay registros para el filtro seleccionado.</p>}</div>}
      </section>
    </div>
  </main>;
}
