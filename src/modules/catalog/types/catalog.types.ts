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
  imageUrl?: string | null;
  imageKey?: string | null;
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
  images?: Array<{ imageKey: string; altText?: string | null; sortOrder?: number; isPrimary?: boolean }>;
}

export interface ProductVariantAttribute {
  attributeId?: number;
  attributeValueId?: number;
  attributeName: string;
  attributeValue: string;
}

export interface CartItem extends ProductCardData {
  quantity: number;
  saleItemId?: number;
  variantName?: string | null;
  attributes?: ProductVariantAttribute[];
}
