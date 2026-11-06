import { httpRequest } from "../../../shared/services/httpClient";
import type { ProductCardData, CartItem } from "../../catalog/types/catalog.types";
import type { BackendCart, BackendCartItem } from "../types/cart.types";
import { getOrCreateGuestCartToken, readGuestCartToken } from "./guestCartStorage";

const colorsByCategory: Record<string, string> = {
  Ropa: "#27272a",
  Hamburguesas: "#d97706",
  Bebidas: "#78350f",
  Alimentos: "#fbbf24",
};

let cartRequest: Promise<CartItem[]> | null = null;
let guestCartRequest: Promise<CartItem[]> | null = null;

function toCartItem(item: BackendCartItem): CartItem {
  const product: ProductCardData = {
    id: item.variantId,
    name: item.productName,
    category: "General",
    price: Number(item.unitPrice),
    sku: item.sku,
    isComposite: false,
    showPos: true,
    color: colorsByCategory.General ?? "#6366f1",
  };

  return { ...product, quantity: Number(item.quantity), saleItemId: item.saleItemId, variantName: item.variantName };
}

export async function getCart(): Promise<CartItem[]> {
  if (cartRequest) return cartRequest;
  cartRequest = httpRequest<BackendCart>("/cart")
    .then((response) => response.items.map(toCartItem))
    .finally(() => { cartRequest = null; });
  return cartRequest;
}

export async function addCartItem(variantId: number, quantity = 1): Promise<CartItem[]> {
  const response = await httpRequest<BackendCart>("/cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
  return response.items.map(toCartItem);
}

export async function updateCartItem(saleItemId: number, quantity: number): Promise<CartItem[]> {
  const response = await httpRequest<BackendCart>(`/cart/items/${saleItemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
  return response.items.map(toCartItem);
}

export async function removeCartItem(saleItemId: number): Promise<CartItem[]> {
  const response = await httpRequest<BackendCart>(`/cart/items/${saleItemId}`, {
    method: "DELETE",
  });
  return response.items.map(toCartItem);
}

export async function clearCart(): Promise<void> {
  await httpRequest<void>("/cart", {
    method: "DELETE",
  });
}

export async function clearCartItems(saleItemIds: number[]): Promise<void> {
  for (const saleItemId of saleItemIds) {
    await removeCartItem(saleItemId);
  }

  await clearCart();
}

const guestOptions = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "X-Guest-Cart-Token": getOrCreateGuestCartToken() },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const guestPath = (path = ""): string => {
  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  return `/cart/guest${path}${path.includes("?") ? "&" : "?"}companyId=${encodeURIComponent(companyId)}`;
};

export async function getGuestCart(): Promise<CartItem[]> {
  if (!readGuestCartToken()) return [];
  if (guestCartRequest) return guestCartRequest;
  guestCartRequest = httpRequest<BackendCart>(guestPath(), guestOptions("GET"))
    .then((response) => response.items.map(toCartItem))
    .finally(() => { guestCartRequest = null; });
  return guestCartRequest;
}

export async function addGuestCartItem(variantId: number, quantity = 1): Promise<CartItem[]> {
  const response = await httpRequest<BackendCart>(guestPath("/items"), guestOptions("POST", { variantId, quantity }));
  return response.items.map(toCartItem);
}

export async function updateGuestCartItem(saleItemId: number, quantity: number): Promise<CartItem[]> {
  const response = await httpRequest<BackendCart>(guestPath(`/items/${saleItemId}`), guestOptions("PUT", { quantity }));
  return response.items.map(toCartItem);
}

export async function removeGuestCartItem(saleItemId: number): Promise<CartItem[]> {
  const response = await httpRequest<BackendCart>(guestPath(`/items/${saleItemId}`), guestOptions("DELETE"));
  return response.items.map(toCartItem);
}

export async function claimGuestCart(): Promise<CartItem[]> {
  const token = readGuestCartToken();
  if (!token) return [];
  const companyId = import.meta.env.VITE_COMPANY_ID ?? "1";
  const response = await httpRequest<BackendCart>(`/cart/guest/claim?companyId=${encodeURIComponent(companyId)}`, {
    method: "POST",
    headers: { "X-Guest-Cart-Token": token },
  });
  return response.items.map(toCartItem);
}

export async function clearGuestCartBackend(): Promise<void> {
  if (!readGuestCartToken()) return;
  await httpRequest<void>(guestPath(), guestOptions("DELETE"));
}
