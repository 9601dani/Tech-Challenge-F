import { httpRequest } from "../../../shared/services/httpClient";
import type { ProductCardData, ProductVariantAttribute, ProductVariantOption } from "../types/catalog.types";

interface ProductListResponse {
  data: Array<{
    productId: number;
    categoryName: string | null;
    name: string;
    isComposite: boolean;
    price: number | null;
    sku: string;
    stockQuantity: number;
    variantId: number;
    variantName: string | null;
    showPos: boolean;
    reservedQuantity: number;
    availableQuantity: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

const colorsByCategory: Record<string, string> = {
  Ropa: "#27272a",
  Hamburguesas: "#d97706",
  Bebidas: "#78350f",
  Alimentos: "#fbbf24",
};

export async function listPublicProducts(search = ""): Promise<ProductCardData[]> {
  const query = new URLSearchParams({
    companyId: import.meta.env.VITE_COMPANY_ID ?? "1",
    page: "1",
    pageSize: "50",
  });

  if (search.trim()) query.set("search", search.trim());

  const response = await httpRequest<ProductListResponse>(`/catalog/products?${query.toString()}`);

  const visibleProducts = response.data
    .filter((product) => product.showPos)
    .map((product) => ({
      ...product,
      price: Number(product.price ?? 0),
      stockQuantity: Number(product.stockQuantity),
      reservedQuantity: Number(product.reservedQuantity),
      availableQuantity: Number(product.availableQuantity),
    }));

  const grouped = new Map<number, ProductCardData>();

  for (const product of visibleProducts) {
    const variant: ProductVariantOption = {
      id: product.variantId,
      name: product.variantName ?? "Predeterminado",
      sku: product.sku,
      price: product.price,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      availableQuantity: product.availableQuantity,
    };
    const existing = grouped.get(product.productId);

    if (existing) {
      existing.variants = [...(existing.variants ?? []), variant];
      continue;
    }

    grouped.set(product.productId, {
      id: product.variantId,
      productId: product.productId,
      name: product.name,
      category: product.categoryName ?? "General",
      price: product.price,
      sku: product.sku,
      isComposite: product.isComposite,
      showPos: product.showPos,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      availableQuantity: product.availableQuantity,
      variants: [variant],
      color: colorsByCategory[product.categoryName ?? ""] ?? "#6366f1",
    });
  }

  return [...grouped.values()];
}

interface ProductDetailResponse {
  variantId: number;
  sku: string;
  variantName: string | null;
  price: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  attributes: ProductVariantAttribute[];
}

export async function getProductVariants(productId: number): Promise<ProductVariantOption[]> {
  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  const response = await httpRequest<ProductDetailResponse[]>(`/catalog/products/${productId}?companyId=${encodeURIComponent(companyId)}`);

  return (Array.isArray(response) ? response : []).map((variant) => ({
    id: variant.variantId,
    name: variant.variantName ?? "Predeterminado",
    sku: variant.sku,
    price: Number(variant.price ?? 0),
    stockQuantity: Number(variant.stockQuantity),
    reservedQuantity: Number(variant.reservedQuantity),
    availableQuantity: Number(variant.availableQuantity),
    attributes: (Array.isArray(variant.attributes) ? variant.attributes : [])
      .map((attribute) => {
        const rawAttribute = attribute as ProductVariantAttribute & Record<string, unknown>;
        return {
          attributeName: String(rawAttribute.attributeName ?? rawAttribute.AttributeName ?? ""),
          attributeValue: String(rawAttribute.attributeValue ?? rawAttribute.AttributeValue ?? ""),
        };
      })
      .filter((attribute) => attribute.attributeName.length > 0 && attribute.attributeValue.length > 0),
  }));
}

export async function getProductVariantBySku(sku: string): Promise<ProductVariantOption[]> {
  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  const response = await httpRequest<ProductDetailResponse[]>(`/catalog/products/sku/${encodeURIComponent(sku)}?companyId=${encodeURIComponent(companyId)}`);

  return (Array.isArray(response) ? response : []).map((variant) => ({
    id: variant.variantId,
    name: variant.variantName ?? "Predeterminado",
    sku: variant.sku,
    price: Number(variant.price ?? 0),
    stockQuantity: Number(variant.stockQuantity),
    reservedQuantity: Number(variant.reservedQuantity),
    availableQuantity: Number(variant.availableQuantity),
    attributes: (Array.isArray(variant.attributes) ? variant.attributes : [])
      .map((attribute) => {
        const rawAttribute = attribute as ProductVariantAttribute & Record<string, unknown>;
        return {
          attributeName: String(rawAttribute.attributeName ?? rawAttribute.AttributeName ?? ""),
          attributeValue: String(rawAttribute.attributeValue ?? rawAttribute.AttributeValue ?? ""),
        };
      })
      .filter((attribute) => attribute.attributeName.length > 0 && attribute.attributeValue.length > 0),
  }));
}
