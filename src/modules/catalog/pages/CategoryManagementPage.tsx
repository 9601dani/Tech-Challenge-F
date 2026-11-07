import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  createCatalogCategory,
  listCatalogCategories,
  updateCatalogCategory,
  type CatalogCategory,
} from "../services/catalogApi";

interface CategoryForm {
  name: string;
  description: string;
  parentCategoryId: string;
}

const emptyForm: CategoryForm = { name: "", description: "", parentCategoryId: "" };

export function CategoryManagementPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      setCategories(await listCatalogCategories());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCategories(); }, []);

  const visibleCategories = categories.filter((category) =>
    `${category.name} ${category.description ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(category: CatalogCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
      parentCategoryId: category.parentCategoryId?.toString() ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }
    if (editingId && Number(form.parentCategoryId) === editingId) {
      setError("Una categoría no puede ser su propia categoría padre.");
      return;
    }

    setSaving(true);
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        ...(form.parentCategoryId ? { parentCategoryId: Number(form.parentCategoryId) } : {}),
      };
      if (editingId) {
        await updateCatalogCategory(editingId, input);
        await Swal.fire({ icon: "success", title: "Categoría actualizada", confirmButtonColor: "#2f2eaa" });
      } else {
        await createCatalogCategory(input);
        await Swal.fire({ icon: "success", title: "Categoría creada", text: "Ya puedes asignarla a tus productos.", confirmButtonColor: "#2f2eaa" });
      }
      resetForm();
      await loadCategories();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la categoría");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#f7f7ff] px-4 py-6 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[#d9dcf4] bg-white px-4 py-2 text-sm font-bold text-[#2f2eaa] shadow-sm" onClick={() => navigate("/catalog/products/manage")} type="button">
          ← Regresar a productos
        </button>

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#dc2626]">Catálogo</p>
            <h1 className="mt-2 text-3xl font-black">Categorías</h1>
            <p className="mt-1 text-sm text-[#64748b]">Administra las categorías que se asignan a los productos.</p>
          </div>
          <button className="rounded-xl bg-[#dc2626] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91c1c]" onClick={resetForm} type="button">+ Nueva categoría</button>
        </div>

        <section className="mb-8 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{editingId ? "Editar categoría" : "Nueva categoría"}</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-3" onSubmit={submit}>
            <label className="text-sm font-semibold">Nombre<input className="field" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} /></label>
            <label className="text-sm font-semibold">Descripción<input className="field" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label>
            <label className="text-sm font-semibold">Categoría padre<select className="field" onChange={(event) => setForm((current) => ({ ...current, parentCategoryId: event.target.value }))} value={form.parentCategoryId}><option value="">Categoría principal</option>{categories.filter((category) => category.id !== editingId && category.active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-3">{error}</p>}
            <div className="flex gap-3 md:col-span-3"><button className="rounded-xl bg-[#2f2eaa] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear categoría"}</button>{editingId && <button className="rounded-xl border border-[#d9dcf4] px-5 py-3 font-bold" onClick={resetForm} type="button">Cancelar</button>}</div>
          </form>
        </section>

        <section className="rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><h2 className="text-xl font-black">Categorías registradas</h2><input className="field max-w-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar categoría" value={search} /></div>
          {loading ? <p className="py-10 text-center text-[#64748b]">Cargando categorías...</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-[#eef0ff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-3 py-3">Nombre</th><th className="px-3 py-3">Descripción</th><th className="px-3 py-3">Categoría padre</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead><tbody>{visibleCategories.map((category) => <tr className="border-b border-[#f0f1fa]" key={category.id}><td className="px-3 py-4 font-bold">{category.name}</td><td className="px-3 py-4">{category.description || "—"}</td><td className="px-3 py-4">{categories.find((parent) => parent.id === category.parentCategoryId)?.name ?? "Principal"}</td><td className="px-3 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${category.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{category.active ? "Activa" : "Inactiva"}</span></td><td className="px-3 py-4"><button className="rounded-lg bg-[#eef0ff] px-3 py-2 font-bold text-[#2f2eaa]" onClick={() => startEdit(category)} type="button">Editar</button></td></tr>)}</tbody></table>{!visibleCategories.length && <p className="py-10 text-center text-[#64748b]">No hay categorías para mostrar.</p>}</div>}
        </section>
      </div>
    </main>
  );
}
