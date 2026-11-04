export interface ProductCardData {
  id: number;
  productId?: number;
  name: string;
  category: string;
  price: number;
  sku: string;
  isComposite: boolean;
  showPos: boolean;
  stockQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  variants?: ProductVariantOption[];
  color: string;
  badge?: string;
}

export interface ProductVariantOption {
  id: number;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  attributes?: ProductVariantAttribute[];
}

export interface ProductVariantAttribute {
  attributeName: string;
  attributeValue: string;
}

export interface CartItem extends ProductCardData {
  quantity: number;
  saleItemId?: number;
  variantName?: string | null;
  attributes?: ProductVariantAttribute[];
}
