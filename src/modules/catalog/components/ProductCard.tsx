import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { getProductVariants } from "../services/catalogApi";
import type { ProductCardData, ProductVariantOption } from "../types/catalog.types";

interface ProductCardProps {
  product: ProductCardData;
  onAdd: (product: ProductCardData) => void;
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

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const variants = product.variants ?? [];
  const requiresModal = product.isComposite || variants.length > 1;

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

  function addSimpleProduct() {
    const variant = variants[0] ?? {
      id: product.id,
      name: "Predeterminado",
      sku: product.sku,
      price: product.price,
      stockQuantity: product.stockQuantity ?? 0,
      reservedQuantity: product.reservedQuantity ?? 0,
      availableQuantity: product.availableQuantity ?? 0,
    };
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
        if (!selectedInfo) return;

        const selects = attributeNames.map((_attributeName, index) => document.querySelector<HTMLSelectElement>(`#shopcart-attribute-${index}`));
        const refreshOptions = () => {
          const selectedValues = new Map(attributeNames.map((attributeName, index) => [attributeName, selects[index]?.value ?? ""]));

          attributeNames.forEach((attributeName, index) => {
            const select = selects[index];
            if (!select) return;
            const previousSelections = attributeNames.slice(0, index).filter((name) => selectedValues.get(name)).every((name) => {
              const expectedValue = selectedValues.get(name);
              return variantOptions.some((variant) => variant.availableQuantity > 0 && variant.attributes?.some((attribute) => attribute.attributeName === name && attribute.attributeValue === expectedValue));
            });
            const values = [...new Set(variantOptions
              .filter((variant) => variant.availableQuantity > 0 && previousSelections && attributeNames.slice(0, index).every((name) => variant.attributes?.some((attribute) => attribute.attributeName === name && attribute.attributeValue === selectedValues.get(name))))
              .flatMap((variant) => variant.attributes?.filter((attribute) => attribute.attributeName === attributeName).map((attribute) => attribute.attributeValue) ?? []))];
            const currentValue = selectedValues.get(attributeName);
            select.innerHTML = values.length > 0
              ? values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")
              : `<option value="">Sin opciones disponibles</option>`;
            if (currentValue && values.includes(currentValue)) select.value = currentValue;
            selectedValues.set(attributeName, select.value);
          });

          const selected = variantOptions.find((variant) => variant.availableQuantity > 0 && attributeNames.every((name) => variant.attributes?.some((attribute) => attribute.attributeName === name && attribute.attributeValue === selectedValues.get(name))));
          selectedInfo.innerHTML = selected
            ? `SKU: ${escapeHtml(selected.sku)} · Disponible: ${selected.availableQuantity} · Q ${selected.price.toFixed(2)}`
            : "Esta combinación no tiene existencia disponible";
        };

        selects.forEach((select) => select?.addEventListener("change", refreshOptions));
        refreshOptions();
      },
      preConfirm: () => {
        if (hasAttributes) {
          const selected = variantOptions.find((variant) => variant.availableQuantity > 0 && attributeNames.every((attributeName, index) => {
            const value = document.querySelector<HTMLSelectElement>(`#shopcart-attribute-${index}`)?.value;
            return variant.attributes?.some((attribute) => attribute.attributeName === attributeName && attribute.attributeValue === value);
          }));
          if (!selected) {
            Swal.showValidationMessage("La combinación seleccionada no tiene existencia disponible");
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

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#e4e6f5] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <button className="relative flex h-48 w-full items-center justify-center bg-[#f0f1ff]" onClick={handleProductAction} type="button">
        {product.badge && <span className="absolute left-4 top-4 rounded-full bg-[#2f2eaa] px-3 py-1 text-xs font-semibold text-white">{product.badge}</span>}
        <div className="h-28 w-28 rounded-full shadow-inner transition group-hover:scale-105" style={{ backgroundColor: product.color }} />
      </button>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">{product.category}</p>
        <button className="mt-2 min-h-12 text-left text-lg font-bold text-[#0f172a]" onClick={handleProductAction} type="button">{product.name}</button>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xl font-black text-[#2f2eaa]">Desde Q {product.price.toFixed(2)}</span>
            <p className={`mt-1 text-xs font-semibold ${availableQuantity > 0 ? "text-[#64748b]" : "text-[#dc2626]"}`}>
              {availableQuantity > 0 ? `Disponible: ${availableQuantity}` : requiresModal ? "Ver variantes disponibles" : "Agotado"}
            </p>
          </div>
          <button className="rounded-xl bg-[#2f2eaa] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#25248e] disabled:cursor-not-allowed disabled:bg-[#c7c9df]" disabled={!requiresModal && availableQuantity <= 0} onClick={handleProductAction} type="button">
            {requiresModal ? "Seleccionar" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
