import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { resolveImageUrl } from "../../../shared/utils/imageUrl";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  createCatalogProduct,
  createCatalogVariant,
  createCatalogAttribute,
  createCatalogAttributeValue,
  attachCatalogProductImage,
  deleteCatalogProductImage,
  deleteCatalogProduct,
  listCatalogComponents,
  listCatalogCategories,
  listCatalogAttributes,
  listCatalogProducts,
  listCatalogProductImages,
  getProductVariants,
  reactivateCatalogProduct,
  updateCatalogProduct,
  updateCatalogVariant,
  replaceCatalogComponents,
  replaceCatalogVariantAttributes,
  uploadCatalogImages,
  type CatalogProductImage,
  type CatalogAttribute,
  type CatalogComponent,
  type CatalogCategory,
  type CatalogProductAdminItem,
} from "../services/catalogApi";

interface ProductForm {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  showPos: boolean;
  isComposite: boolean;
  trackInventory: boolean;
  sku: string;
  price: string;
  initialQuantity: string;
}

interface VariantDraft {
  sku: string;
  name: string;
  price: string;
  initialQuantity: string;
  components?: EditableComponent[];
}

interface EditableVariant extends VariantDraft {
  id: number;
}

interface EditableComponent {
  componentVariantId: number;
  quantity: string;
}

interface EditableAttribute {
  attributeId: number;
  attributeValueId: number;
}

const emptyForm: ProductForm = {
  code: "", name: "", description: "", categoryId: "", showPos: true,
  isComposite: false, trackInventory: true, sku: "", price: "", initialQuantity: "0",
};

const money = (value: number | null) => value === null ? "Sin precio" : `Q ${Number(value).toFixed(2)}`;
type ProductVisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN" | "INACTIVE";

interface ProductManagementPageProps {
  canEdit: boolean;
  canDelete: boolean;
}

export function ProductManagementPage({ canEdit, canDelete }: ProductManagementPageProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProductAdminItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [extraVariants, setExtraVariants] = useState<VariantDraft[]>([]);
  const [editableVariants, setEditableVariants] = useState<EditableVariant[]>([]);
  const [newVariants, setNewVariants] = useState<VariantDraft[]>([]);
  const [editableComponents, setEditableComponents] = useState<Record<number, EditableComponent[]>>({});
  const [componentLabels, setComponentLabels] = useState<Record<number, string>>({});
  const [editableAttributes, setEditableAttributes] = useState<Record<number, EditableAttribute[]>>({});
  const [editingVariantIds, setEditingVariantIds] = useState<number[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<CatalogAttribute[]>([]);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<ProductVisibilityFilter>("ALL");
  const [productPage, setProductPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [selectedImageVariants, setSelectedImageVariants] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<CatalogProductImage[]>([]);

  useEffect(() => {
    const previews = selectedImages.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setSelectedImagePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [selectedImages]);
  const productsSectionRef = useRef<HTMLElement | null>(null);

  const groupedProducts = useMemo(() => {
    const groups = new Map<number, CatalogProductAdminItem[]>();
    products.forEach((item) => groups.set(item.productId, [...(groups.get(item.productId) ?? []), item]));
    return [...groups.values()].map((variants) => ({ product: variants[0], variants }))
      .filter(({ product }) => {
        if (visibilityFilter === "INACTIVE") return product.active === false;
        if (visibilityFilter === "HIDDEN") return product.active !== false && !product.showPos;
        if (visibilityFilter === "VISIBLE") return product.active !== false && product.showPos;
        return true;
      });
  }, [products, visibilityFilter]);

  const productsPerPage = 4;
  const totalProductPages = Math.max(1, Math.ceil(groupedProducts.length / productsPerPage));
  const pagedProducts = groupedProducts.slice((productPage - 1) * productsPerPage, productPage * productsPerPage);

  useEffect(() => {
    setProductPage(1);
  }, [search, visibilityFilter]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      setProducts(await listCatalogProducts(search));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el catálogo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [search]);

  useEffect(() => {
    listCatalogCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  function updateField<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleComposite(enabled: boolean) {
    updateField("isComposite", enabled);
    if (!enabled) {
      setEditableComponents({});
      setExtraVariants((current) => current.map((variant) => ({ ...variant, components: [] })));
    }
  }

  async function startEdit(item: CatalogProductAdminItem, variants: CatalogProductAdminItem[] = [item]) {
    const productVariants = variants.length > 1 ? variants : products.filter((product) => product.productId === item.productId);
    setEditingId(item.productId);
    setForm({
      code: item.code, name: item.name, description: item.description ?? "", categoryId: item.categoryId?.toString() ?? "",
      showPos: item.showPos, isComposite: item.isComposite, trackInventory: item.trackInventory,
      sku: "", price: "", initialQuantity: "0",
    });
    setExtraVariants([]);
    setEditableVariants(productVariants.map((variant) => ({ id: variant.variantId, sku: variant.sku, name: variant.variantName ?? item.name, price: String(variant.price ?? ""), initialQuantity: String(variant.stockQuantity ?? 0) })));
    setEditableComponents({});
    setComponentLabels({});
    setEditingVariantIds(productVariants.map((variant) => variant.variantId));
    setEditableAttributes({});
    setSelectedImages([]);
    setSelectedImageVariants({});
    setProductImages([]);
    try {
      const [variantDetails, availableAttributes, images] = await Promise.all([getProductVariants(item.productId), listCatalogAttributes(), listCatalogProductImages(item.productId)]);
      setProductImages(images);
      setAttributeOptions(availableAttributes);
      const currentAttributes: Record<number, EditableAttribute[]> = {};
      variantDetails.forEach((variant) => {
        currentAttributes[variant.id] = (variant.attributes ?? [])
          .map((attribute) => {
            const definition = availableAttributes.find((option) => option.attributeId === attribute.attributeId || option.name.trim().toLocaleLowerCase() === attribute.attributeName.trim().toLocaleLowerCase());
            const value = definition?.values.find((option) => option.attributeValueId === attribute.attributeValueId || option.value.trim().toLocaleLowerCase() === attribute.attributeValue.trim().toLocaleLowerCase());
            return definition && value ? { attributeId: definition.attributeId, attributeValueId: value.attributeValueId } : null;
          })
          .filter((attribute): attribute is EditableAttribute => attribute !== null && attribute.attributeId > 0 && attribute.attributeValueId > 0);
      });
      setEditableAttributes(currentAttributes);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los atributos");
    }
    if (item.isComposite) {
      try {
        const components = await listCatalogComponents(item.productId);
        setComponentLabels(Object.fromEntries(components.map((component) => [component.componentVariantId, component.componentName || component.componentProductName || component.componentSku])));
        const componentsByVariant = components.reduce<Record<number, EditableComponent[]>>((result, component: CatalogComponent) => {
          result[component.parentVariantId] = [...(result[component.parentVariantId] ?? []), { componentVariantId: component.componentVariantId, quantity: String(component.quantity) }];
          return result;
        }, {});
        setEditableComponents(Object.fromEntries(Object.entries(componentsByVariant).map(([parentVariantId, variantComponents]) => [parentVariantId, mergeComponents(variantComponents)])));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los componentes");
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() { setEditingId(null); setForm(emptyForm); setExtraVariants([]); setEditableVariants([]); setNewVariants([]); setEditableComponents({}); setComponentLabels({}); setEditableAttributes({}); setEditingVariantIds([]); setSelectedImages([]); setSelectedImageVariants({}); setProductImages([]); }

  function removeSelectedImage(index: number) {
    const file = selectedImages[index];
    setSelectedImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
    if (file) setSelectedImageVariants((current) => {
      const next = { ...current };
      delete next[imageFileKey(file)];
      return next;
    });
  }

  function imageFileKey(file: File): string { return `${file.name}-${file.size}-${file.lastModified}`; }

  function addSelectedImages(files: File[]) {
    setSelectedImages((current) => {
      const existing = new Set(current.map(imageFileKey));
      const newFiles = files.filter((file) => !existing.has(imageFileKey(file)));
      return [...current, ...newFiles];
    });
  }

  function updateSelectedImageVariant(file: File, variantSku: string) {
    setSelectedImageVariants((current) => ({ ...current, [imageFileKey(file)]: variantSku }));
  }

  function addSelectedImagesForVariant(files: File[], variantSku: string) {
    addSelectedImages(files);
    setSelectedImageVariants((current) => {
      const next = { ...current };
      files.forEach((file) => { next[imageFileKey(file)] = variantSku; });
      return next;
    });
  }

  function updateExtraVariant(index: number, field: keyof VariantDraft, value: string) {
    setExtraVariants((current) => current.map((variant, currentIndex) => currentIndex === index ? { ...variant, [field]: value } : variant));
  }

  function addExtraVariantComponent(variantIndex: number) {
    updateField("isComposite", true);
    setExtraVariants((current) => current.map((variant, index) => index === variantIndex
      ? { ...variant, components: [...(variant.components ?? []), { componentVariantId: 0, quantity: "1" }] }
      : variant));
  }

  function updateExtraVariantComponent(variantIndex: number, componentIndex: number, field: keyof EditableComponent, value: string) {
    setExtraVariants((current) => current.map((variant, index) => {
      if (index !== variantIndex) return variant;
      const components = [...(variant.components ?? [])];
      const component = components[componentIndex];
      if (!component) return variant;
      components[componentIndex] = { ...component, [field]: field === "componentVariantId" ? Number(value) : value };
      return { ...variant, components: mergeComponents(components) };
    }));
  }

  function removeExtraVariantComponent(variantIndex: number, componentIndex: number) {
    setExtraVariants((current) => current.map((variant, index) => index === variantIndex
      ? { ...variant, components: (variant.components ?? []).filter((_, currentIndex) => currentIndex !== componentIndex) }
      : variant));
  }

  function updateEditableVariant(index: number, field: keyof VariantDraft, value: string) {
    setEditableVariants((current) => current.map((variant, currentIndex) => currentIndex === index ? { ...variant, [field]: value } : variant));
  }

  function addComponent(variantId: number) {
    setEditableComponents((current) => ({ ...current, [variantId]: [...(current[variantId] ?? []), { componentVariantId: 0, quantity: "1" }] }));
  }

  function mergeComponents(components: EditableComponent[]): EditableComponent[] {
    const merged = new Map<number, EditableComponent>();
    const emptyRows: EditableComponent[] = [];

    components.forEach((component) => {
      const componentVariantId = Number(component.componentVariantId);
      if (!Number.isFinite(componentVariantId) || componentVariantId <= 0) {
        emptyRows.push({ ...component, componentVariantId: 0 });
        return;
      }

      const existing = merged.get(componentVariantId);
      if (existing) {
        existing.quantity = String(Number(existing.quantity || 0) + Number(component.quantity || 0));
      } else {
        merged.set(componentVariantId, { ...component, componentVariantId });
      }
    });

    return [...merged.values(), ...emptyRows];
  }

  function updateComponent(variantId: number, index: number, field: keyof EditableComponent, value: string) {
    setEditableComponents((current) => {
      const components = [...(current[variantId] ?? [])];
      const selectedComponent = components[index];
      if (!selectedComponent) return current;
      components[index] = { ...selectedComponent, [field]: field === "componentVariantId" ? Number(value) : value };
      return { ...current, [variantId]: mergeComponents(components) };
    });
  }

  function removeComponent(variantId: number, index: number) {
    setEditableComponents((current) => ({ ...current, [variantId]: (current[variantId] ?? []).filter((_, componentIndex) => componentIndex !== index) }));
  }

  async function addAttribute(variantId: number) {
    const assignedIds = new Set((editableAttributes[variantId] ?? []).map((attribute) => attribute.attributeId));
    const availableAttributes = attributeOptions.filter((attribute) => !assignedIds.has(attribute.attributeId));
    if (!availableAttributes.length) {
      await Swal.fire({ icon: "info", title: "Sin atributos disponibles", text: "Esta variante ya tiene todos los atributos configurados.", confirmButtonColor: "#2f2eaa" });
      return;
    }

    const inputOptions = Object.fromEntries(availableAttributes.map((attribute) => [String(attribute.attributeId), attribute.name]));
    const result = await Swal.fire({
      title: "Agregar atributo",
      input: "select",
      inputOptions,
      inputPlaceholder: "Selecciona un atributo",
      showCancelButton: true,
      confirmButtonColor: "#2f2eaa",
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => value ? undefined : "Selecciona un atributo",
    });
    if (!result.isConfirmed || !result.value) return;

    const selected = availableAttributes.find((attribute) => attribute.attributeId === Number(result.value));
    if (!selected) return;
    setEditableAttributes((current) => ({ ...current, [variantId]: [...(current[variantId] ?? []), { attributeId: selected.attributeId, attributeValueId: selected.values[0]?.attributeValueId ?? 0 }] }));
  }

  function updateAttribute(variantId: number, index: number, field: keyof EditableAttribute, value: string) {
    setEditableAttributes((current) => ({ ...current, [variantId]: (current[variantId] ?? []).map((attribute, attributeIndex) => {
      if (attributeIndex !== index) return attribute;
      if (field === "attributeId") {
        const definition = attributeOptions.find((option) => option.attributeId === Number(value));
        return { attributeId: Number(value), attributeValueId: definition?.values[0]?.attributeValueId ?? 0 };
      }
      return { ...attribute, attributeValueId: Number(value) };
    }) }));
  }

  function removeAttribute(variantId: number, index: number) {
    setEditableAttributes((current) => ({ ...current, [variantId]: (current[variantId] ?? []).filter((_, attributeIndex) => attributeIndex !== index) }));
  }

  async function createAttribute() {
    const attributePrompt = await Swal.fire({ title: "Nuevo atributo", input: "text", inputLabel: "Nombre", inputPlaceholder: "Ej. Color", showCancelButton: true, confirmButtonColor: "#2f2eaa", confirmButtonText: "Continuar", cancelButtonText: "Cancelar", inputValidator: (value) => value.trim() ? undefined : "El nombre es obligatorio" });
    if (!attributePrompt.isConfirmed || !attributePrompt.value) return;
    const valuePrompt = await Swal.fire({ title: "Primer valor", input: "text", inputLabel: "Valor del atributo", inputPlaceholder: "Ej. Negro", showCancelButton: true, confirmButtonColor: "#2f2eaa", confirmButtonText: "Crear", cancelButtonText: "Cancelar", inputValidator: (value) => value.trim() ? undefined : "El valor es obligatorio" });
    if (!valuePrompt.isConfirmed || !valuePrompt.value) return;
    try {
      const created = await createCatalogAttribute(attributePrompt.value.trim()) as { IDAttribute?: number; id?: number };
      const attributeId = created.IDAttribute ?? created.id;
      if (!attributeId) throw new Error("No se pudo identificar el atributo creado");
      await createCatalogAttributeValue(attributeId, valuePrompt.value.trim());
      setAttributeOptions(await listCatalogAttributes());
      await Swal.fire({ icon: "success", title: "Atributo creado", confirmButtonColor: "#2f2eaa" });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo crear el atributo"); }
  }

  async function createAttributeValue(attributeId: number) {
    const prompt = await Swal.fire({ title: "Nuevo valor", input: "text", inputLabel: "Valor", showCancelButton: true, confirmButtonColor: "#2f2eaa", confirmButtonText: "Agregar", cancelButtonText: "Cancelar", inputValidator: (value) => value.trim() ? undefined : "El valor es obligatorio" });
    if (!prompt.isConfirmed || !prompt.value) return;
    try { await createCatalogAttributeValue(attributeId, prompt.value.trim()); setAttributeOptions(await listCatalogAttributes()); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo crear el valor"); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.code.trim() || !form.name.trim()) { setError("El código y el nombre son obligatorios."); return; }
    if (!editingId && (!form.sku.trim() || form.price === "" || Number(form.price) < 0)) { setError("Para crear el producto indica SKU y precio de su variante."); return; }

    setSaving(true);
    try {
      const common = {
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        code: form.code.trim(), name: form.name.trim(), description: form.description.trim() || undefined,
        isComposite: form.isComposite, trackInventory: form.trackInventory, showPos: form.showPos,
      };
      if (editingId) {
        await updateCatalogProduct(editingId, common);
        if (selectedImages.length > 0) {
          const uploaded = await uploadCatalogImages(selectedImages);
          await Promise.all(uploaded.images.map((image, index) => {
            const variantSku = selectedImageVariants[imageFileKey(selectedImages[index])];
            return attachCatalogProductImage(editingId, { imageKey: image.imageKey, sortOrder: productImages.length + index, ...(variantSku ? { variantSku } : {}) });
          }));
        }
        if (editableVariants.length > 0) {
          if (editableVariants.some((variant) => !variant.sku.trim() || variant.price === "" || Number(variant.price) < 0)) {
            setError("Cada variante debe tener SKU y un precio válido.");
            return;
          }
          await Promise.all(editableVariants.map((variant) => updateCatalogVariant(variant.id, { sku: variant.sku.trim(), name: variant.name.trim() || undefined, price: Number(variant.price) })));
        }
        if (form.isComposite) {
          const parentVariants = editableVariants.map((variant) => variant.id);
          await Promise.all(parentVariants.map((variantId) => replaceCatalogComponents(variantId, mergeComponents(editableComponents[variantId] ?? []).filter((component) => component.componentVariantId > 0 && Number(component.quantity) > 0).map((component) => ({ componentVariantId: component.componentVariantId, quantity: Number(component.quantity) })) )));
        }
        for (const variantId of editingVariantIds) {
          try {
            await replaceCatalogVariantAttributes(variantId, (editableAttributes[variantId] ?? []).filter((attribute) => attribute.attributeId > 0 && attribute.attributeValueId > 0));
          } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : "Uno de los atributos o valores no pertenece a la empresa.";
            throw new Error(`No se pudieron guardar los atributos de la variante #${variantId}: ${message}`);
          }
        }
        await Swal.fire({ icon: "success", title: "Producto actualizado", text: "Los cambios se guardaron.", confirmButtonColor: "#2f2eaa" });
      } else {
        const uploaded = selectedImages.length > 0 ? await uploadCatalogImages(selectedImages) : { images: [] };
        const defaultComponents = form.isComposite ? mergeComponents(editableComponents[-1] ?? [])
          .filter((component) => component.componentVariantId > 0 && Number(component.quantity) > 0)
          .map((component) => ({ componentVariantId: component.componentVariantId, quantity: Number(component.quantity) })) : [];
        const variants = [{ sku: form.sku.trim(), name: form.name.trim(), price: Number(form.price), initialQuantity: Number(form.initialQuantity) || 0, ...(defaultComponents.length > 0 ? { components: defaultComponents } : {}) }, ...extraVariants.map((variant) => ({ sku: variant.sku.trim(), name: variant.name.trim() || form.name.trim(), price: Number(variant.price), initialQuantity: Number(variant.initialQuantity) || 0, ...(form.isComposite && variant.components && variant.components.length > 0 ? { components: mergeComponents(variant.components).filter((component) => component.componentVariantId > 0 && Number(component.quantity) > 0).map((component) => ({ componentVariantId: component.componentVariantId, quantity: Number(component.quantity) })) } : {}) }))];
        if (variants.some((variant) => !variant.sku || Number.isNaN(variant.price) || variant.price < 0)) { setError("Cada variante debe tener SKU y un precio válido."); return; }
        await createCatalogProduct({ ...common, variants, images: uploaded.images.map((image, index) => {
          const variantSku = selectedImageVariants[imageFileKey(selectedImages[index])];
          return { imageKey: image.imageKey, sortOrder: index, isPrimary: index === 0, ...(variantSku ? { variantSku } : {}) };
        }) });
        await Swal.fire({ icon: "success", title: "Producto creado", text: "El producto y su variante fueron registrados.", confirmButtonColor: "#2f2eaa" });
      }
      // Después de guardar no se conserva el formulario abierto. Esto evita
      // confundir la edición finalizada con el formulario para crear otro producto.
      resetForm();
      await loadData();
      requestAnimationFrame(() => productsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el producto");
    } finally { setSaving(false); }
  }

  async function removeProductImage(image: CatalogProductImage) {
    if (!editingId) return;
    const result = await Swal.fire({ title: "¿Eliminar imagen?", text: "La imagen se desactivará para este producto.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" });
    if (!result.isConfirmed) return;
    try {
      await deleteCatalogProductImage(editingId, image.id);
      setProductImages((current) => current.filter((item) => item.id !== image.id));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la imagen"); }
  }

  async function deactivate(item: CatalogProductAdminItem) {
    const result = await Swal.fire({ title: `¿Desactivar ${item.name}?`, text: "No se eliminará físicamente.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Desactivar", cancelButtonText: "Cancelar" });
    if (!result.isConfirmed) return;
    try { await deleteCatalogProduct(item.productId); await loadData(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo desactivar el producto"); }
  }

  async function saveNewVariant(index: number) {
    if (!editingId) return;
    const variant = newVariants[index];
    if (!variant?.sku.trim() || variant.price === "" || Number(variant.price) < 0) {
      setError("La nueva variante debe tener SKU y un precio válido.");
      return;
    }
    try {
      setSaving(true);
      await createCatalogVariant(editingId, { sku: variant.sku.trim(), name: variant.name.trim() || undefined, price: Number(variant.price), initialQuantity: Number(variant.initialQuantity) || 0 });
      const refreshedProducts = await listCatalogProducts(search);
      setProducts(refreshedProducts);
      setNewVariants((current) => current.filter((_, currentIndex) => currentIndex !== index));
      const refreshedVariants = refreshedProducts.filter((product) => product.productId === editingId);
      if (refreshedVariants[0]) await startEdit(refreshedVariants[0], refreshedVariants);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear la variante");
    } finally {
      setSaving(false);
    }
  }

  async function reactivate(item: CatalogProductAdminItem) {
    try {
      await reactivateCatalogProduct(item.productId);
      await Swal.fire({ icon: "success", title: "Producto reactivado", text: "Volverá a estar disponible en el catálogo.", confirmButtonColor: "#2f2eaa" });
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo reactivar el producto");
    }
  }

  const componentParentVariants = editableVariants.length > 1
    ? editableVariants.map((variant) => ({ id: variant.id, label: variant.name || variant.sku }))
    : editingId
      ? products.filter((product) => product.productId === editingId).map((product) => ({ id: product.variantId, label: product.variantName || product.sku }))
      : form.isComposite ? [{ id: -1, label: form.name || "Variante predeterminada" }] : [];
  const componentOptions = [...products.filter((product) => editingId === null || product.productId !== editingId), ...Object.entries(componentLabels)
    .filter(([variantId]) => !products.some((product) => Number(product.variantId) === Number(variantId)))
    .map(([variantId, name]) => ({ productId: 0, companyId: 0, variantId: Number(variantId), categoryId: null, categoryName: null, code: "", name, description: null, isComposite: false, showPos: true, active: true, sku: "", variantName: name, price: null, stockQuantity: 0, availableQuantity: 0 }))];
  const hasExplicitVariants = editingId ? editableVariants.length > 1 : extraVariants.length > 0;
  const imageVariantOptions = editingId
    ? editableVariants.map((variant) => ({ sku: variant.sku, label: variant.name || variant.sku }))
    : [{ sku: form.sku, label: form.name || form.sku }, ...extraVariants.map((variant) => ({ sku: variant.sku, label: variant.name || variant.sku }))]
      .filter((variant) => variant.sku.trim());
  const hasVariantSpecificImages = imageVariantOptions.length > 1 || imageVariantOptions.some((variant) =>
    !/(?:^|-)DEFAULT$/i.test(variant.sku) && variant.label.trim().toLocaleLowerCase() !== form.name.trim().toLocaleLowerCase()
  );

  function renderVariantImages(variant: { sku: string; label: string; id?: number }) {
    const pendingImages = selectedImagePreviews.filter((preview) => selectedImageVariants[imageFileKey(preview.file)] === variant.sku);
    const savedImages = variant.id ? productImages.filter((image) => image.variantId === variant.id) : [];
    return <div className="mt-3 rounded-lg border border-dashed border-[#c7c9df] bg-white p-3">
      <p className="text-xs font-bold text-[#2f2eaa]">Imágenes de {variant.label}</p>
      <input accept="image/jpeg,image/png,image/webp" className="field mt-2" multiple onChange={(event) => { addSelectedImagesForVariant(Array.from(event.target.files ?? []), variant.sku); event.currentTarget.value = ""; }} type="file" />
      {(pendingImages.length > 0 || savedImages.length > 0) && <div className="mt-2 flex flex-wrap gap-2">
        {pendingImages.map((preview) => <div className="relative w-16 rounded border border-dashed border-[#2f2eaa] p-1" key={`${preview.file.name}-${preview.file.lastModified}`}><img alt={preview.file.name} className="h-12 w-full rounded object-cover" src={preview.url} /><button className="absolute right-0 top-0 rounded bg-red-600 px-1 text-[9px] font-bold text-white" onClick={() => removeSelectedImage(selectedImages.findIndex((file) => imageFileKey(file) === imageFileKey(preview.file)))} type="button">×</button></div>)}
        {savedImages.map((image) => <div className="relative w-16 rounded border border-[#d9dcf4] p-1" key={image.id}><img alt={image.altText ?? "Imagen del producto"} className="h-12 w-full rounded object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} src={resolveImageUrl(image.imageKey)} /><button className="absolute right-0 top-0 rounded bg-red-600 px-1 text-[9px] font-bold text-white" onClick={() => void removeProductImage(image)} type="button">×</button></div>)}
      </div>}
    </div>;
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#f7f7ff] px-4 py-6 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#dc2626]">Catálogo</p><h1 className="mt-2 text-3xl font-black">Editar productos</h1><p className="mt-1 text-sm text-[#64748b]">Crea, actualiza o desactiva productos y sus variantes vendibles.</p></div>
          <div className="flex flex-wrap gap-3">
            {canEdit && <button className="rounded-xl bg-[#dc2626] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91c1c]" onClick={() => navigate("/catalog/categories/manage")} type="button">+ Nueva categoría</button>}
            {canEdit && <button className="rounded-xl border border-[#d9dcf4] bg-white px-4 py-3 text-sm font-bold text-[#2f2eaa] shadow-sm" onClick={resetForm} type="button">+ Nuevo producto</button>}
          </div>
        </div>

        {canEdit && <section className="mb-8 rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{editingId ? "Actualizar producto" : "Crear producto"}</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <label className="text-sm font-semibold">Código<input className="field" onChange={(e) => updateField("code", e.target.value)} required value={form.code} /></label>
            <label className="text-sm font-semibold">Nombre<input className="field" onChange={(e) => updateField("name", e.target.value)} required value={form.name} /></label>
            <label className="text-sm font-semibold">Categoría<select className="field" onChange={(e) => updateField("categoryId", e.target.value)} value={form.categoryId}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-sm font-semibold">Descripción<input className="field" onChange={(e) => updateField("description", e.target.value)} value={form.description} /></label>
            {!hasVariantSpecificImages && <div className="rounded-xl border border-[#d9dcf4] bg-[#fafaff] p-3 text-sm md:col-span-2 xl:col-span-4">
              <p className="font-bold">Imágenes del producto</p>
              <p className="mt-1 text-xs text-[#64748b]">Selecciona una o varias imágenes. Se subirán al bucket al guardar.</p>
              <input accept="image/jpeg,image/png,image/webp" className="field mt-3" multiple onChange={(event) => { addSelectedImages(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} type="file" />
              {selectedImagePreviews.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6"><p className="col-span-full text-xs font-bold uppercase tracking-wide text-[#64748b]">Pendientes de guardar</p>{selectedImagePreviews.map((preview, index) => <div className="relative rounded-lg border border-dashed border-[#2f2eaa] bg-white p-1" key={`${preview.file.name}-${preview.file.lastModified}`}><img alt={preview.file.name} className="h-14 w-full rounded object-cover" src={preview.url} /><button aria-label={`Quitar ${preview.file.name}`} className="absolute right-0 top-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white" onClick={() => removeSelectedImage(index)} type="button">×</button><p className="mt-1 truncate text-[9px] text-[#64748b]">{preview.file.name}</p>{imageVariantOptions.length > 1 && <select className="mt-1 w-full rounded border border-[#d9dcf4] px-1 py-1 text-[9px]" onChange={(event) => updateSelectedImageVariant(preview.file, event.target.value)} value={selectedImageVariants[imageFileKey(preview.file)] ?? ""}><option value="">Imagen general</option>{imageVariantOptions.map((variant) => <option key={variant.sku} value={variant.sku}>{variant.label}</option>)}</select>}</div>)}</div>}
              {editingId && productImages.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{productImages.map((image) => <div className="relative rounded-lg border border-[#d9dcf4] bg-white p-1" key={image.id}><img alt={image.altText ?? "Imagen del producto"} className="h-14 w-full rounded object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} src={resolveImageUrl(image.imageKey)} /><button className="absolute right-0 top-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white" onClick={() => void removeProductImage(image)} type="button">×</button><p className="mt-1 truncate text-[9px] text-[#64748b]">{image.imageKey}</p></div>)}</div>}
            </div>}
            {!editingId && <><label className="text-sm font-semibold">SKU inicial<input className="field" onChange={(e) => updateField("sku", e.target.value)} required value={form.sku} /></label><label className="text-sm font-semibold">Precio<input className="field" min="0" onChange={(e) => updateField("price", e.target.value)} required step="0.01" type="number" value={form.price} /></label><label className="text-sm font-semibold">Existencia inicial<input className="field" min="0" onChange={(e) => updateField("initialQuantity", e.target.value)} step="0.001" type="number" value={form.initialQuantity} /></label><div className="md:col-span-2 xl:col-span-4"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-bold">Variantes adicionales</span><button className="text-sm font-bold text-[#2f2eaa]" onClick={() => setExtraVariants((current) => [...current, { sku: "", name: "", price: "", initialQuantity: "0", components: [] }])} type="button">+ Agregar variante</button></div>{extraVariants.map((variant, index) => <div className="mb-3 rounded-xl bg-[#f7f7ff] p-3" key={index}><div className="grid gap-3 sm:grid-cols-4"><input className="field mt-0" onChange={(e) => updateExtraVariant(index, "sku", e.target.value)} placeholder="SKU" value={variant.sku} /><input className="field mt-0" onChange={(e) => updateExtraVariant(index, "name", e.target.value)} placeholder="Nombre" value={variant.name} /><input className="field mt-0" min="0" onChange={(e) => updateExtraVariant(index, "price", e.target.value)} placeholder="Precio" step="0.01" type="number" value={variant.price} /><div className="flex gap-2"><input className="field mt-0" min="0" onChange={(e) => updateExtraVariant(index, "initialQuantity", e.target.value)} placeholder="Existencia" step="0.001" type="number" value={variant.initialQuantity} /><button className="rounded-lg px-2 text-red-600" onClick={() => setExtraVariants((current) => current.filter((_, currentIndex) => currentIndex !== index))} type="button">×</button></div></div>{variant.components !== undefined && <div className="mt-3 rounded-lg bg-white p-3"><p className="mb-2 text-sm font-bold text-[#2f2eaa]">Componentes de {variant.name || "esta variante"}</p>{(variant.components ?? []).map((component, componentIndex) => <div className="mb-2 flex flex-col gap-2 sm:flex-row" key={`${index}-${componentIndex}`}><select className="field mt-0 flex-1" onChange={(event) => updateExtraVariantComponent(index, componentIndex, "componentVariantId", event.target.value)} value={component.componentVariantId || ""}><option value="">Selecciona un componente</option>{componentOptions.map((option) => <option key={`${option.productId}-${option.variantId}`} value={option.variantId}>{option.name}</option>)}</select><input className="field mt-0 w-full sm:max-w-32" min="0.001" onChange={(event) => updateExtraVariantComponent(index, componentIndex, "quantity", event.target.value)} step="0.001" type="number" value={component.quantity} /><button className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700" onClick={() => removeExtraVariantComponent(index, componentIndex)} type="button">Quitar</button></div>)}<button className="text-sm font-bold text-[#2f2eaa]" onClick={() => addExtraVariantComponent(index)} type="button">+ Agregar componente</button></div>}</div>)}</div></>}
            {!editingId && hasVariantSpecificImages && <div className="rounded-xl border border-[#d9dcf4] bg-[#fafaff] p-4 text-sm md:col-span-2 xl:col-span-4"><p className="font-bold">Imágenes por variante</p>{imageVariantOptions.map((variant) => <div key={variant.sku}>{renderVariantImages(variant)}</div>)}</div>}
            <div className="flex flex-wrap items-center gap-4 text-sm md:col-span-2 xl:col-span-4"><label><input checked={form.showPos} onChange={(e) => updateField("showPos", e.target.checked)} type="checkbox" /> <span className="ml-1">Mostrar en tienda</span></label>{!hasExplicitVariants && <label><input checked={form.isComposite} onChange={(e) => toggleComposite(e.target.checked)} type="checkbox" /> <span className="ml-1">Producto compuesto</span></label>}<label><input checked={form.trackInventory} onChange={(e) => updateField("trackInventory", e.target.checked)} type="checkbox" /> <span className="ml-1">Controla inventario</span></label></div>
            {editingId && <div className="rounded-xl bg-[#f7f7ff] p-4 md:col-span-2 xl:col-span-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">Variantes del producto</p><button className="text-sm font-bold text-[#2f2eaa]" onClick={() => setNewVariants((current) => [...current, { sku: "", name: "", price: "", initialQuantity: "0" }])} type="button">+ Nueva variante</button></div>{editableVariants.length > 0 && <div className="space-y-3">{editableVariants.map((variant, index) => <div className="grid gap-3 sm:grid-cols-3" key={variant.id}><label className="text-sm font-semibold">SKU<input className="field" onChange={(event) => updateEditableVariant(index, "sku", event.target.value)} value={variant.sku} /></label><label className="text-sm font-semibold">Nombre<input className="field" onChange={(event) => updateEditableVariant(index, "name", event.target.value)} value={variant.name} /></label><label className="text-sm font-semibold">Precio<input className="field" min="0" onChange={(event) => updateEditableVariant(index, "price", event.target.value)} step="0.01" type="number" value={variant.price} /></label></div>)}</div>}{hasVariantSpecificImages && <div className="mt-4 space-y-3"><p className="text-sm font-bold">Imágenes por variante</p>{imageVariantOptions.map((variant) => { const current = editableVariants.find((item) => item.sku === variant.sku); return <div key={variant.sku}>{renderVariantImages({ ...variant, id: current?.id })}</div>; })}</div>}{newVariants.map((variant, index) => <div className="mt-3 grid gap-3 rounded-xl border border-dashed border-[#c7c9df] p-3 sm:grid-cols-4" key={`new-${index}`}><input className="field mt-0" onChange={(event) => setNewVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} placeholder="SKU" value={variant.sku} /><input className="field mt-0" onChange={(event) => setNewVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Nombre" value={variant.name} /><input className="field mt-0" min="0" onChange={(event) => setNewVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} placeholder="Precio" step="0.01" type="number" value={variant.price} /><input className="field mt-0" min="0" onChange={(event) => setNewVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, initialQuantity: event.target.value } : item))} placeholder="Existencia inicial" step="0.001" type="number" value={variant.initialQuantity} /><button className="rounded-lg bg-[#2f2eaa] px-3 py-2 text-sm font-bold text-white" disabled={saving} onClick={() => void saveNewVariant(index)} type="button">Guardar variante</button></div>)}</div>}
            {editingId && editingVariantIds.length > 0 && <div className="rounded-xl border border-[#d9dcf4] bg-white p-4 md:col-span-2 xl:col-span-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">Atributos de las variantes</p><p className="text-xs text-[#64748b]">Selecciona valores como color, talla o cualquier otro atributo configurado.</p></div><button className="rounded-lg bg-[#eef0ff] px-3 py-2 text-xs font-bold text-[#2f2eaa]" onClick={() => void createAttribute()} type="button">+ Nuevo atributo</button></div><div className="grid gap-4 lg:grid-cols-2">{editingVariantIds.map((variantId) => <div className="rounded-xl bg-[#f7f7ff] p-3" key={variantId}><p className="mb-3 text-sm font-bold text-[#2f2eaa]">{products.find((product) => product.variantId === variantId)?.variantName || products.find((product) => product.variantId === variantId)?.sku || `Variante ${variantId}`}</p>{(editableAttributes[variantId] ?? []).map((attribute, index) => { const definition = attributeOptions.find((option) => option.attributeId === attribute.attributeId); return <div className="mb-2 flex flex-col gap-2 sm:flex-row" key={`${variantId}-${index}`}><select className="field mt-0 flex-1" onChange={(event) => updateAttribute(variantId, index, "attributeId", event.target.value)} value={attribute.attributeId}><option value="">Atributo</option>{attributeOptions.filter((option) => option.attributeId === attribute.attributeId || !(editableAttributes[variantId] ?? []).some((current) => current.attributeId === option.attributeId)).map((option) => <option key={option.attributeId} value={option.attributeId}>{option.name}</option>)}</select><select className="field mt-0 flex-1" onChange={(event) => updateAttribute(variantId, index, "attributeValueId", event.target.value)} value={attribute.attributeValueId}><option value="">Valor</option>{(definition?.values ?? []).map((value) => <option key={value.attributeValueId} value={value.attributeValueId}>{value.value}</option>)}</select>{definition && <button className="rounded-lg bg-[#eef0ff] px-3 py-2 text-xs font-bold text-[#2f2eaa]" onClick={() => void createAttributeValue(definition.attributeId)} type="button">+ Valor</button>}<button className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700" onClick={() => removeAttribute(variantId, index)} type="button">Quitar</button></div>; })}<button className="text-sm font-bold text-[#2f2eaa] disabled:text-[#94a3b8]" disabled={attributeOptions.length === 0} onClick={() => void addAttribute(variantId)} type="button">+ Agregar atributo</button></div>)}</div></div>}
            {form.isComposite && <div className="rounded-xl border border-[#d9dcf4] bg-[#fafaff] p-4 md:col-span-2 xl:col-span-4"><div className="mb-3"><p className="text-sm font-bold">Componentes / receta (BOM)</p><p className="text-xs text-[#64748b]">Selecciona los componentes y la cantidad necesaria para fabricar una unidad.</p></div><div className="space-y-4">{componentParentVariants.map((parent) => <div className="rounded-xl bg-white p-3" key={parent.id}><p className="mb-2 text-sm font-bold text-[#2f2eaa]">Variante: {parent.label}</p>{(editableComponents[parent.id] ?? []).map((component, index) => <div className="mb-2 flex flex-col gap-2 sm:flex-row" key={`${parent.id}-${index}`}><select className="field mt-0 flex-1" onChange={(event) => updateComponent(parent.id, index, "componentVariantId", event.target.value)} value={component.componentVariantId || ""}><option value="">Selecciona un componente</option>{componentOptions.map((option) => <option key={`${option.productId}-${option.variantId}`} value={option.variantId}>{option.name}</option>)}</select><input className="field mt-0 w-full sm:max-w-32" min="0.001" onChange={(event) => updateComponent(parent.id, index, "quantity", event.target.value)} step="0.001" type="number" value={component.quantity} /><button className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700" onClick={() => removeComponent(parent.id, index)} type="button">Quitar</button></div>)}<button className="text-sm font-bold text-[#2f2eaa]" onClick={() => addComponent(parent.id)} type="button">+ Agregar componente</button></div>)}</div></div>}
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2 xl:col-span-4">{error}</p>}
            <div className="flex gap-3 md:col-span-2 xl:col-span-4"><button className="rounded-xl bg-[#2f2eaa] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear producto"}</button>{editingId && <button className="rounded-xl border border-[#d9dcf4] px-5 py-3 font-bold" onClick={resetForm} type="button">Cancelar</button>}</div>
          </form>
        </section>}

        <section ref={productsSectionRef} className="rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black">Productos registrados</h2><select className="field max-w-xs" onChange={(event) => setVisibilityFilter(event.target.value as ProductVisibilityFilter)} value={visibilityFilter}><option value="ALL">Todos los productos</option><option value="VISIBLE">Solo activos visibles</option><option value="HIDDEN">Solo activos ocultos</option><option value="INACTIVE">Solo inactivos</option></select></div><input className="field max-w-sm" onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o SKU" value={search} /></div>{loading ? <p className="py-10 text-center text-[#64748b]">Cargando productos...</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#eef0ff] text-xs uppercase tracking-wider text-[#64748b]"><tr><th className="px-3 py-3">Producto</th><th className="px-3 py-3">Categoría</th><th className="px-3 py-3">Variantes</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead><tbody>{pagedProducts.map(({ product, variants }) => <tr className="border-b border-[#f0f1fa]" key={product.productId}><td className="px-3 py-4"><p className="font-bold">{product.name}</p><p className="text-xs text-[#64748b]">{product.code}</p></td><td className="px-3 py-4">{product.categoryName ?? "General"}</td><td className="px-3 py-4">{variants.map((variant) => <div key={variant.variantId} className="mb-1 text-xs"><b>{variant.sku}</b> · {money(variant.price)} · stock {variant.availableQuantity}</div>)}</td><td className="px-3 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.active !== false ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{product.active !== false ? (product.showPos ? "Activo · visible" : "Activo · oculto") : "Inactivo"}</span></td><td className="px-3 py-4"><div className="flex gap-2">{product.active !== false ? <><button className="rounded-lg bg-[#eef0ff] px-3 py-2 font-bold text-[#2f2eaa]" onClick={() => startEdit(product, variants)} type="button">Editar</button><button className={canDelete ? "rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700" : "hidden"} onClick={() => void deactivate(product)} type="button">Desactivar</button></> : <button className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700" onClick={() => void reactivate(product)} type="button">Reactivar</button>}</div></td></tr>)}</tbody></table>{!groupedProducts.length && <p className="py-10 text-center text-[#64748b]">No hay productos para mostrar.</p>}{groupedProducts.length > 0 && <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eef0ff] pt-4"><p className="text-sm text-[#64748b]">Página {productPage} de {totalProductPages}</p><div className="flex gap-2"><button className="rounded-lg border border-[#d9dcf4] px-3 py-2 text-sm font-bold disabled:opacity-40" disabled={productPage === 1} onClick={() => setProductPage((page) => Math.max(1, page - 1))} type="button">Anterior</button><button className="rounded-lg bg-[#2f2eaa] px-3 py-2 text-sm font-bold text-white disabled:opacity-40" disabled={productPage === totalProductPages} onClick={() => setProductPage((page) => Math.min(totalProductPages, page + 1))} type="button">Siguiente</button></div></div>}</div>}</section>
      </div>
    </main>
  );
}
