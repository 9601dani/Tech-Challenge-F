import type { CartItem } from "../../catalog/types/catalog.types";

export interface BackendCartItem {
  saleItemId: number;
  variantId: number;
  sku: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface BackendCart {
  saleId: number;
  companyId: number;
  branchId: number | null;
  userId: number;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  lastActivityAt: string;
  items: BackendCartItem[];
}

export type { CartItem };
