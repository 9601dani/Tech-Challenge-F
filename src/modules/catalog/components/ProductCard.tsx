import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { getManufacturedAvailability, getProductVariants } from "../services/catalogApi";
import type { ProductCardData, ProductVariantOption } from "../types/catalog.types";

interface ProductCardProps {
  product: ProductCardData;
  onAdd: (product: ProductCardData) => void;
  directVariantMatch?: boolean;
}

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function getFallbackAttributes(productName: string, variantName: string): ProductVariantOption["attributes"] {
  const normalizedProductName = productName.trim().toLocaleLowerCase();
  const normalizedVariantName = variantName.trim();
  const variantWithoutProduct = normalizedVariantName.toLocaleLowerCase().startsWith(normalizedProductName)
    ? normalizedVariantName.slice(productName.length).trim()
    : normalizedVariantName;

  const sizeMatch = variantWithoutProduct.match(/^(.*?)\s+talla\s+(.+)$/i);
  if (sizeMatch) {
    return [
      { attributeName: "Color", attributeValue: sizeMatch[1].trim() },
      { attributeName: "Talla", attributeValue: sizeMatch[2].trim() },
    ].filter((attribute) => attribute.attributeValue.length > 0);
  }

  if (variantWithoutProduct && variantWithoutProduct !== "Predeterminado") {
    return [{ attributeName: "Variante", attributeValue: variantWithoutProduct }];
  }

  return [];
}

export function ProductCard({ product, onAdd, directVariantMatch = false }: ProductCardProps) {
  const variants = product.variants ?? [];
  const requiresModal = !directVariantMatch && (product.isComposite || variants.length > 1);

  async function copySku() {
    try {
      await navigator.clipboard.writeText(product.sku);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "SKU copiado",
        showConfirmButton: false,
        timer: 1400,
      });
    } catch {
      await Swal.fire({
        icon: "error",
        title: "No se pudo copiar",
        text: "Copia el SKU manualmente.",
        confirmButtonColor: "#2f2eaa",
      });
    }
  }

  function getSelectedProduct(variant: ProductVariantOption): ProductCardData {
    return {
      ...product,
      id: variant.id,
      name: variant.name === "Predeterminado" ? product.name : `${product.name} · ${variant.name}`,
      price: variant.price,
      sku: variant.sku,
      stockQuantity: variant.stockQuantity,
      reservedQuantity: variant.reservedQuantity,
      availableQuantity: variant.availableQuantity,
    };
  }

  async function addSimpleProduct() {
    const variant = variants[0] ?? {
      id: product.id,
      name: "Predeterminado",
      sku: product.sku,
      price: product.price,
      stockQuantity: product.stockQuantity ?? 0,
      reservedQuantity: product.reservedQuantity ?? 0,
      availableQuantity: product.availableQuantity ?? 0,
    };

    if (product.isComposite && product.productId) {
      try {
        const availability = await getManufacturedAvailability(product.productId);
        const manufacturedVariant = availability.find((item) => item.variantId === Number(variant.id));
        if (!manufacturedVariant || manufacturedVariant.availableQuantity <= 0) {
          await Swal.fire({
            icon: "warning",
            title: "Sin existencia disponible",
            text: "Los componentes necesarios para fabricar esta variante no tienen existencia suficiente.",
            confirmButtonColor: "#2f2eaa",
          });
          return;
        }

        onAdd(getSelectedProduct({
          ...variant,
          stockQuantity: manufacturedVariant.parentPhysicalQuantity,
          reservedQuantity: manufacturedVariant.parentReservedQuantity,
          availableQuantity: manufacturedVariant.availableQuantity,
        }));
        return;
      } catch {
        await Swal.fire({
          icon: "error",
          title: "No se pudo verificar la existencia",
          text: "Intenta nuevamente antes de agregar el producto.",
          confirmButtonColor: "#2f2eaa",
        });
        return;
      }
    }

    onAdd(getSelectedProduct(variant));
  }

  async function openVariantModal() {
    let variantOptions = variants.length > 0 ? variants : [{
      id: product.id,
      name: "Predeterminado",
      sku: product.sku,
      price: product.price,
      stockQuantity: product.stockQuantity ?? 0,
      reservedQuantity: product.reservedQuantity ?? 0,
      availableQuantity: product.availableQuantity ?? 0,
    }];

    if (product.productId) {
      try {
        const detailedVariants = await getProductVariants(product.productId);
        if (detailedVariants.length > 0) variantOptions = detailedVariants;
      } catch {
        // Se conserva la información del listado como respaldo visual.
      }
    }

    if (product.isComposite && product.productId) {
      try {
        const availability = await getManufacturedAvailability(product.productId);
        variantOptions = variantOptions.map((variant) => {
          const manufacturedVariant = availability.find((item) => item.variantId === variant.id);
          return manufacturedVariant
            ? {
                ...variant,
                stockQuantity: manufacturedVariant.parentPhysicalQuantity,
                reservedQuantity: manufacturedVariant.parentReservedQuantity,
                availableQuantity: manufacturedVariant.availableQuantity,
              }
            : variant;
        });
      } catch {
        // Si el endpoint no está disponible, se conserva la disponibilidad del catálogo.
      }
    }

    // El endpoint público del catálogo no incluye ProductVariantAttribute y el
    // endpoint de detalle requiere JWT. Para visitantes construimos un
    // respaldo visual desde el nombre de la variante, sin cambiar el backend.
    variantOptions = variantOptions.map((variant) => ({
      ...variant,
      attributes: variant.attributes?.length
        ? variant.attributes
        : getFallbackAttributes(product.name, variant.name),
    }));
    const attributeNames = [...new Set(variantOptions.flatMap((variant) => (variant.attributes ?? []).map((attribute) => attribute.attributeName)).filter(Boolean))];
    const hasAttributes = attributeNames.length > 0;

    const combinationHtml = hasAttributes
      ? `
        <p class="shopcart-modal-subtitle">Selecciona las características del producto</p>
        <div class="shopcart-selection-grid">
          ${attributeNames.map((attributeName, index) => `<label>${escapeHtml(attributeName)}<select id="shopcart-attribute-${index}" data-attribute-name="${escapeHtml(attributeName)}"></select></label>`).join("")}
        </div>
        <div id="shopcart-selected-variant" class="shopcart-selected-variant"></div>
      `
      : `
        <p class="shopcart-modal-subtitle">Selecciona una variante disponible</p>
        <div class="shopcart-variants">
          ${variantOptions.map((variant) => {
            const available = variant.availableQuantity > 0;
            return `
              <label class="shopcart-variant ${available ? "" : "shopcart-variant-disabled"}">
                <input type="radio" name="shopcart-variant" value="${variant.id}" ${available ? "" : "disabled"}>
                <span class="shopcart-variant-info"><strong>${escapeHtml(variant.name)}</strong><small>SKU: ${escapeHtml(variant.sku)}</small></span>
                <span class="shopcart-variant-stock ${available ? "" : "shopcart-stock-empty"}">${available ? `Disponible: ${variant.availableQuantity}` : "Agotado"}</span>
                <span class="shopcart-variant-price">Q ${variant.price.toFixed(2)}</span>
              </label>
            `;
          }).join("")}
        </div>
      `;

    const result = await Swal.fire<number>({
      title: escapeHtml(product.name),
      html: combinationHtml,
      showCancelButton: true,
      confirmButtonText: "Agregar al carrito",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2f2eaa",
      focusConfirm: false,
      didOpen: () => {
        if (!hasAttributes) return;
        const selectedInfo = document.querySelector<HTMLDivElement>("#shopcart-selected-variant");
        const selectionGrid = document.querySelector<HTMLDivElement>(".shopcart-selection-grid");
        if (!selectedInfo || !selectionGrid) return;

        const availableVariants = variantOptions.filter((variant) => variant.availableQuantity > 0);
        const matches = (variant: ProductVariantOption, selections: Map<string, string>, ignoredAttribute?: string) =>
          [...selections.entries()].every(([name, value]) => name === ignoredAttribute || !value || variant.attributes?.some((attribute) => attribute.attributeName === name && attribute.attributeValue === value));

        const refreshOptions = (previousSelections = new Map<string, string>()) => {
          // Las variantes que no tienen stock no participan en las opciones del cliente.
          let selections = new Map(previousSelections);
          let candidates = availableVariants.filter((variant) => matches(variant, selections));

          // Si una selección dejó de ser compatible, se elimina para poder elegir otra.
          for (const [name, value] of selections) {
            if (!candidates.some((variant) => variant.attributes?.some((attribute) => attribute.attributeName === name && attribute.attributeValue === value))) {
              selections.delete(name);
            }
          }
          candidates = availableVariants.filter((variant) => matches(variant, selections));

          const visibleNames = attributeNames.filter((name) => candidates.some((variant) => variant.attributes?.some((attribute) => attribute.attributeName === name)));
          selectionGrid.innerHTML = visibleNames.map((name, index) => {
            const values = [...new Set(availableVariants
              .filter((variant) => matches(variant, selections, name))
              .flatMap((variant) => variant.attributes?.filter((attribute) => attribute.attributeName === name).map((attribute) => attribute.attributeValue) ?? []))];
            const selectedValue = selections.get(name) ?? "";
            return `<label>${escapeHtml(name)}<select id="shopcart-attribute-${index}" data-attribute-name="${escapeHtml(name)}">
              <option value="">Selecciona una opción</option>
              ${values.map((value) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select></label>`;
          }).join("");

          const renderedSelections = new Map(
            [...selectionGrid.querySelectorAll<HTMLSelectElement>("select")]
              .map((select) => [select.dataset.attributeName ?? "", select.value] as [string, string])
              .filter(([name, value]) => name && value)
          );
          candidates = availableVariants.filter((variant) => matches(variant, renderedSelections));
          selectionGrid.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
            select.addEventListener("change", () => {
              const nextSelections = new Map(
                [...selectionGrid.querySelectorAll<HTMLSelectElement>("select")]
                  .map((current) => [current.dataset.attributeName ?? "", current.value] as [string, string])
                  .filter(([name, value]) => name && value)
              );
              refreshOptions(nextSelections);
            });
          });

          const selected = visibleNames.length > 0 && visibleNames.every((name) => renderedSelections.has(name))
            ? candidates.find((variant) => matches(variant, renderedSelections))
            : undefined;
          selectedInfo.innerHTML = selected
            ? `SKU: ${escapeHtml(selected.sku)} · Disponible: ${selected.availableQuantity} · Q ${selected.price.toFixed(2)}`
            : "Selecciona una combinación disponible";
        };

        refreshOptions();
      },
      preConfirm: () => {
        if (hasAttributes) {
          const selections = new Map(
            [...document.querySelectorAll<HTMLSelectElement>(".shopcart-selection-grid select")]
              .map((select) => [select.dataset.attributeName ?? "", select.value] as [string, string])
              .filter(([name, value]) => name && value)
          );
          const visibleNames = [...document.querySelectorAll<HTMLSelectElement>(".shopcart-selection-grid select")]
            .map((select) => select.dataset.attributeName ?? "")
            .filter(Boolean);
          const selected = variantOptions.find((variant) => variant.availableQuantity > 0 && visibleNames.every((name) => selections.has(name)) && [...selections.entries()].every(([name, value]) => variant.attributes?.some((attribute) => attribute.attributeName === name && attribute.attributeValue === value)));
          if (!selected) {
            Swal.showValidationMessage("Selecciona una combinación disponible");
            return undefined;
          }
          return selected.id;
        }

        const selected = document.querySelector<HTMLInputElement>("input[name='shopcart-variant']:checked");
        if (!selected) {
          Swal.showValidationMessage("Selecciona una variante disponible");
          return undefined;
        }
        return Number(selected.value);
      },
    });

    if (!result.isConfirmed || result.value === undefined) return;
    const selectedVariant = variantOptions.find((variant) => variant.id === result.value);
    if (selectedVariant) onAdd(getSelectedProduct(selectedVariant));
  }

  const handleProductAction = requiresModal ? openVariantModal : addSimpleProduct;
  const availableQuantity = product.availableQuantity ?? 0;
  const isDefaultProduct = variants.length === 0
    || (variants.length === 1 && (
      variants[0].name === "Predeterminado"
      || /(?:^|-)DEFAULT$/i.test(variants[0].sku)
      || variants[0].name.trim().toLocaleLowerCase() === product.name.trim().toLocaleLowerCase()
    ));
  const showSku = directVariantMatch || isDefaultProduct;

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#e4e6f5] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <button className="relative flex h-48 w-full items-center justify-center bg-[#f0f1ff]" onClick={handleProductAction} type="button">
        {product.badge && <span className="absolute left-4 top-4 rounded-full bg-[#2f2eaa] px-3 py-1 text-xs font-semibold text-white">{product.badge}</span>}
        <div className="h-28 w-28 rounded-full shadow-inner transition group-hover:scale-105" style={{ backgroundColor: product.color }} />
      </button>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">{product.category}</p>
        <button className="mt-2 min-h-12 text-left text-lg font-bold text-[#0f172a]" onClick={handleProductAction} type="button">{product.name}</button>
        {showSku && <button className="mt-1 block cursor-copy text-left text-xs font-semibold text-[#64748b] transition duration-150 hover:-translate-y-0.5 hover:text-[#2f2eaa]" onClick={(event) => { event.stopPropagation(); void copySku(); }} title="Copiar SKU" type="button">SKU: {product.sku}</button>}
        {directVariantMatch && product.variants?.[0]?.name
          && product.variants[0].name !== "Predeterminado"
          && product.variants[0].name.trim().toLocaleLowerCase() !== product.name.trim().toLocaleLowerCase()
          && <p className="mt-1 text-sm font-semibold text-[#2f2eaa]">{product.variants[0].name}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xl font-black text-[#2f2eaa]">Desde Q {product.price.toFixed(2)}</span>
            <p className={`mt-1 text-xs font-semibold ${availableQuantity > 0 ? "text-[#64748b]" : "text-[#dc2626]"}`}>
              {availableQuantity > 0 ? `Disponible: ${availableQuantity}` : product.isComposite ? "Disponibilidad según componentes" : requiresModal ? "Ver variantes disponibles" : "Agotado"}
            </p>
          </div>
          <button className="rounded-xl bg-[#2f2eaa] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#25248e] disabled:cursor-not-allowed disabled:bg-[#c7c9df]" disabled={!requiresModal && !product.isComposite && availableQuantity <= 0} onClick={handleProductAction} type="button">
            {requiresModal ? "Seleccionar" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
