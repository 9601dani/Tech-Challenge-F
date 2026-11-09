import { httpRequest } from "../../../shared/services/httpClient";
import type { ProductCardData, ProductVariantAttribute, ProductVariantOption } from "../types/catalog.types";

export interface CatalogProductAdminItem {
  productId: number;
  companyId: number;
  categoryId: number | null;
  categoryName: string | null;
  code: string;
  name: string;
  description: string | null;
  isComposite: boolean;
  trackInventory: boolean;
  showPos: boolean;
  active?: boolean;
  variantId: number;
  sku: string;
  variantName: string | null;
  price: number | null;
  stockQuantity: number;
  availableQuantity: number;
}

export interface CatalogCategory {
  id: number;
  name: string;
  description: string | null;
  parentCategoryId: number | null;
  active: boolean;
}

export interface CreateCatalogProductInput {
  categoryId?: number;
  code: string;
  name: string;
  description?: string;
  isComposite: boolean;
  trackInventory: boolean;
  showPos: boolean;
  images?: Array<{ imageKey: string; altText?: string; sortOrder?: number; isPrimary?: boolean; variantSku?: string }>;
  variants?: Array<{
    sku: string;
    name: string;
    price: number;
    initialQuantity: number;
    components?: Array<{ componentVariantId: number; quantity: number }>;
  }>;
}

export interface CatalogProductImage {
  id: number;
  productId: number;
  variantId: number | null;
  imageKey: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  active: boolean;
}

export async function listPublicProductImages(productId: number): Promise<CatalogProductImage[]> {
  const response = await httpRequest<CatalogProductImage[]>(`/catalog/products/${productId}/images?companyId=${encodeURIComponent(import.meta.env.VITE_COMPANY_ID ?? "1")}`);
  return response.map((image) => ({
    ...image,
    id: Number(image.id),
    productId: Number(image.productId),
    variantId: image.variantId === null || image.variantId === undefined ? null : Number(image.variantId),
    sortOrder: Number(image.sortOrder),
    isPrimary: Boolean(image.isPrimary),
    active: Boolean(image.active),
  }));
}

export interface UpdateCatalogProductInput {
  categoryId?: number;
  code: string;
  name: string;
  description?: string;
  isComposite: boolean;
  trackInventory: boolean;
  showPos: boolean;
}

interface ProductListResponse {
  data: Array<{
    productId: number;
    categoryId: number | null;
    categoryName: string | null;
    name: string;
    isComposite: boolean;
    price: number | null;
    sku: string;
    stockQuantity: number;
    variantId: number;
    variantName: string | null;
    showPos: boolean;
    imageUrl?: string | null;
    imageKey?: string | null;
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

export interface PublicCatalogFilters {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sortBy?: "name" | "price" | "createdAt";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PublicCatalogResult {
  products: ProductCardData[];
  pagination: ProductListResponse["pagination"];
}

const colorsByCategory: Record<string, string> = {
  Ropa: "#27272a",
  Hamburguesas: "#d97706",
  Bebidas: "#78350f",
  Alimentos: "#fbbf24",
};

const productListRequests = new Map<string, Promise<PublicCatalogResult>>();
const variantSkuRequests = new Map<string, Promise<ProductVariantOption[]>>();

export async function listCatalogProducts(search = ""): Promise<CatalogProductAdminItem[]> {
  const query = new URLSearchParams({
    companyId: import.meta.env.VITE_COMPANY_ID ?? "1",
    page: "1",
    pageSize: "100",
  });
  if (search.trim()) query.set("search", search.trim());
  const response = await httpRequest<{ data: CatalogProductAdminItem[] }>(`/catalog/products/admin?${query.toString()}`);
  return response.data ?? [];
}

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const response = await httpRequest<CatalogCategory[]>(`/catalog/categories?companyId=${encodeURIComponent(import.meta.env.VITE_COMPANY_ID ?? "1")}`);
  return Array.isArray(response) ? response : [];
}

export async function listPublicCategories(): Promise<CatalogCategory[]> {
  const response = await httpRequest<CatalogCategory[]>(`/catalog/categories/public?companyId=${encodeURIComponent(import.meta.env.VITE_COMPANY_ID ?? "1")}`);
  return Array.isArray(response) ? response.filter((category) => category.active) : [];
}

export function createCatalogCategory(input: { name: string; description?: string; parentCategoryId?: number }): Promise<CatalogCategory> {
  return httpRequest<CatalogCategory>("/catalog/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCatalogCategory(categoryId: number, input: { name: string; description?: string; parentCategoryId?: number }): Promise<CatalogCategory> {
  return httpRequest<CatalogCategory>(`/catalog/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteCatalogCategory(categoryId: number): Promise<void> {
  return httpRequest<void>(`/catalog/categories/${categoryId}`, { method: "DELETE" });
}

export function createCatalogProduct(input: CreateCatalogProductInput): Promise<{ id: number }> {
  return httpRequest<{ id: number }>("/catalog/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCatalogProduct(productId: number, input: UpdateCatalogProductInput): Promise<void> {
  return httpRequest<void>(`/catalog/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function uploadCatalogImages(files: File[]): Promise<{ images: Array<{ imageKey: string; imageUrl: string; imageId: string }> }> {
  const formData = new FormData();
  files.forEach((file) => formData.append("image", file));
  return httpRequest<{ images: Array<{ imageKey: string; imageUrl: string; imageId: string }> }>("/catalog/images", { method: "POST", body: formData });
}

export function listCatalogProductImages(productId: number): Promise<CatalogProductImage[]> {
  return httpRequest<CatalogProductImage[]>(`/catalog/products/${productId}/images?companyId=${encodeURIComponent(import.meta.env.VITE_COMPANY_ID ?? "1")}`);
}

export interface CatalogPriceHistoryItem {
  idPrice: number;
  variantId: number;
  sku: string;
  variantName: string | null;
  price: number;
  taxIncluded: boolean;
  startDate: string;
  endDate: string | null;
  active: boolean;
}

export function listCatalogPriceHistory(productId: number): Promise<CatalogPriceHistoryItem[]> {
  return httpRequest<CatalogPriceHistoryItem[]>(`/catalog/products/${productId}/prices`);
}

export function attachCatalogProductImage(productId: number, input: { imageKey: string; altText?: string; sortOrder?: number; isPrimary?: boolean; variantSku?: string }): Promise<{ id: number }> {
  return httpRequest<{ id: number }>(`/catalog/products/${productId}/images`, { method: "POST", body: JSON.stringify(input) });
}

export function deleteCatalogProductImage(productId: number, imageId: number): Promise<void> {
  return httpRequest<void>(`/catalog/products/${productId}/images/${imageId}`, { method: "DELETE" });
}

export function deleteCatalogProduct(productId: number): Promise<void> {
  return httpRequest<void>(`/catalog/products/${productId}`, { method: "DELETE" });
}

export function updateCatalogVariant(variantId: number, input: { sku: string; name?: string; price: number }): Promise<void> {
  return httpRequest<void>(`/catalog/variants/${variantId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function createCatalogVariant(productId: number, input: { sku: string; name?: string; price: number; initialQuantity?: number; attributes?: Array<{ attributeId: number; attributeValueId: number }> }): Promise<{ id: number }> {
  return httpRequest<{ id: number }>(`/catalog/products/${productId}/variants`, { method: "POST", body: JSON.stringify(input) });
}

export interface CatalogComponent {
  parentVariantId: number;
  componentVariantId: number;
  componentSku: string;
  componentName: string;
  componentProductName: string;
  quantity: number;
}

export async function listCatalogComponents(productId: number): Promise<CatalogComponent[]> {
  const response = await httpRequest<CatalogComponent[]>(`/catalog/products/${productId}/components`);
  return response.map((component) => ({
    ...component,
    parentVariantId: Number(component.parentVariantId),
    componentVariantId: Number(component.componentVariantId),
    quantity: Number(component.quantity),
  }));
}

export function replaceCatalogComponents(variantId: number, components: Array<{ componentVariantId: number; quantity: number }>): Promise<void> {
  return httpRequest<void>(`/catalog/variants/${variantId}/components`, {
    method: "PUT",
    body: JSON.stringify({ components }),
  });
}

export interface CatalogAttributeValue {
  attributeValueId: number;
  value: string;
  sortOrder: number;
}

export interface CatalogAttribute {
  attributeId: number;
  name: string;
  attributeType: string;
  values: CatalogAttributeValue[];
}

export async function listCatalogAttributes(): Promise<CatalogAttribute[]> {
  const rows = await httpRequest<Array<{ IDAttribute: number; Name: string; AttributeType: string; IDAttributeValue: number | null; Value: string | null; SortOrder: number | null }>>("/catalog/attributes");
  const grouped = new Map<number, CatalogAttribute>();
  rows.forEach((row) => {
    const raw = row as unknown as Record<string, unknown>;
    const get = (name: string): unknown => {
      const key = Object.keys(raw).find((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase());
      return key ? raw[key] : undefined;
    };
    const attributeId = Number(get("IDAttribute") ?? 0);
    const attributeName = String(get("Name") ?? "");
    const attributeType = String(get("AttributeType") ?? "TEXT");
    const valueId = get("IDAttributeValue");
    const valueText = get("Value");
    const attribute = grouped.get(attributeId) ?? { attributeId, name: attributeName, attributeType, values: [] };
    if (valueId !== null && valueId !== undefined && valueText !== null && valueText !== undefined) attribute.values.push({ attributeValueId: Number(valueId), value: String(valueText), sortOrder: Number(get("SortOrder") ?? 0) });
    grouped.set(attributeId, attribute);
  });
  return [...grouped.values()];
}

export function replaceCatalogVariantAttributes(variantId: number, attributes: Array<{ attributeId: number; attributeValueId: number }>): Promise<void> {
  return httpRequest<void>(`/catalog/variants/${variantId}/attributes`, { method: "PUT", body: JSON.stringify({ attributes }) });
}

export function createCatalogAttribute(name: string, attributeType = "TEXT"): Promise<unknown> {
  return httpRequest<unknown>("/catalog/attributes", { method: "POST", body: JSON.stringify({ name, attributeType }) });
}

export function createCatalogAttributeValue(attributeId: number, value: string, sortOrder = 0): Promise<unknown> {
  return httpRequest<unknown>(`/catalog/attributes/${attributeId}/values`, { method: "POST", body: JSON.stringify({ value, sortOrder }) });
}

export function reactivateCatalogProduct(productId: number): Promise<void> {
  return httpRequest<void>(`/catalog/products/${productId}/reactivate`, { method: "POST" });
}

export async function listPublicProducts(filters: PublicCatalogFilters = {}): Promise<PublicCatalogResult> {
  const normalizedFilters = {
    ...filters,
    search: filters.search?.trim() || undefined,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  };
  const requestKey = JSON.stringify(normalizedFilters);
  const existingRequest = productListRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const query = new URLSearchParams({
    companyId: import.meta.env.VITE_COMPANY_ID ?? "1",
    page: String(normalizedFilters.page),
    pageSize: String(normalizedFilters.pageSize),
  });

  if (normalizedFilters.search) query.set("search", normalizedFilters.search);
  if (normalizedFilters.categoryId) query.set("categoryId", String(normalizedFilters.categoryId));
  if (normalizedFilters.minPrice !== undefined) query.set("minPrice", String(normalizedFilters.minPrice));
  if (normalizedFilters.maxPrice !== undefined) query.set("maxPrice", String(normalizedFilters.maxPrice));
  if (normalizedFilters.available !== undefined) query.set("available", String(normalizedFilters.available));
  if (normalizedFilters.sortBy) query.set("sortBy", normalizedFilters.sortBy);
  if (normalizedFilters.sortDirection) query.set("sortDirection", normalizedFilters.sortDirection);

  const request = httpRequest<ProductListResponse>(`/catalog/products?${query.toString()}`).then(async (response): Promise<PublicCatalogResult> => {

  const visibleProducts = response.data
    .filter((product) => product.showPos)
    .map((product) => ({
      ...product,
      price: Number(product.price ?? 0),
      stockQuantity: Number(product.stockQuantity),
      reservedQuantity: Number(product.reservedQuantity),
      availableQuantity: Number(product.availableQuantity),
    }));

  const normalizedSearch = (normalizedFilters.search ?? "").toLocaleLowerCase();
  const exactSkuMatches = normalizedSearch
    ? visibleProducts.filter((product) => product.sku.trim().toLocaleLowerCase() === normalizedSearch)
    : [];

  if (exactSkuMatches.length > 0) {
    const products = await Promise.all(exactSkuMatches.map(async (product) => {
      let availableQuantity = product.availableQuantity;

      if (product.isComposite) {
        try {
          const manufactured = await getManufacturedAvailability(product.productId);
          availableQuantity = manufactured.find((variant) => variant.variantId === product.variantId)?.availableQuantity ?? availableQuantity;
        } catch {
          // Se conserva el valor entregado por el catálogo como respaldo.
        }
      }

      const variant: ProductVariantOption = {
        id: product.variantId,
        name: product.variantName ?? "Predeterminado",
        sku: product.sku,
        price: product.price,
        stockQuantity: product.stockQuantity,
        reservedQuantity: product.reservedQuantity,
        availableQuantity,
      };

      return {
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
        availableQuantity,
        variants: [variant],
        color: colorsByCategory[product.categoryName ?? ""] ?? "#6366f1",
        imageUrl: product.imageUrl,
        imageKey: product.imageKey,
      } satisfies ProductCardData;
    }));
    return { products, pagination: response.pagination };
  }

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
      imageUrl: product.imageUrl,
      imageKey: product.imageKey,
    });
  }

    return { products: [...grouped.values()], pagination: response.pagination };
  });

  productListRequests.set(requestKey, request);
  void request.finally(() => productListRequests.delete(requestKey)).catch(() => undefined);
  return request;
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

export interface ManufacturedAvailability {
  productId: number;
  productName: string;
  isComposite: boolean;
  variantId: number;
  sku: string;
  variantName: string | null;
  availableQuantity: number;
  parentPhysicalQuantity: number;
  parentReservedQuantity: number;
  isManufactured: boolean;
  components: Array<{
    componentVariantId: number;
    componentSku: string;
    componentVariantName: string | null;
    componentProductName: string;
    requiredQuantity: number;
    physicalQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    possibleQuantity: number;
  }>;
}

export async function getManufacturedAvailability(productId: number): Promise<ManufacturedAvailability[]> {
  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  const response = await httpRequest<ManufacturedAvailability[]>(`/catalog/products/${productId}/manufactured-availability?companyId=${encodeURIComponent(companyId)}`);
  return Array.isArray(response) ? response : [];
}

export async function getProductVariants(productId: number): Promise<ProductVariantOption[]> {
  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  const response = await httpRequest<ProductDetailResponse[]>(`/catalog/products/${productId}?companyId=${encodeURIComponent(companyId)}`);

  return (Array.isArray(response) ? response : []).map((variant) => ({
    id: Number(variant.variantId),
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
          attributeId: Number(rawAttribute.attributeId ?? rawAttribute.AttributeId ?? 0) || undefined,
          attributeValueId: Number(rawAttribute.attributeValueId ?? rawAttribute.AttributeValueId ?? 0) || undefined,
        };
      })
      .filter((attribute) => attribute.attributeName.length > 0 && attribute.attributeValue.length > 0),
  }));
}

export async function getProductVariantBySku(sku: string): Promise<ProductVariantOption[]> {
  const requestKey = sku.trim().toLocaleLowerCase();
  const existingRequest = variantSkuRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  const request = httpRequest<ProductDetailResponse[]>(`/catalog/products/sku/${encodeURIComponent(sku)}?companyId=${encodeURIComponent(companyId)}`).then((response) => (Array.isArray(response) ? response : []).map((variant) => ({
    id: Number(variant.variantId),
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
          attributeId: Number(rawAttribute.attributeId ?? rawAttribute.AttributeId ?? 0) || undefined,
          attributeValueId: Number(rawAttribute.attributeValueId ?? rawAttribute.AttributeValueId ?? 0) || undefined,
        };
      })
      .filter((attribute) => attribute.attributeName.length > 0 && attribute.attributeValue.length > 0),
  })));

  variantSkuRequests.set(requestKey, request);
  void request.finally(() => variantSkuRequests.delete(requestKey)).catch(() => undefined);
  return request;
}
