import type { CartItem } from "../../catalog/types/catalog.types";

export const GUEST_CART_TOKEN_KEY = "shopcart.guestCartToken";
export const GUEST_CART_KEY = "shopcart.guestCart";

function createToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateGuestCartToken(): string {
  const existingToken = localStorage.getItem(GUEST_CART_TOKEN_KEY);
  if (existingToken) return existingToken;

  const token = createToken();
  localStorage.setItem(GUEST_CART_TOKEN_KEY, token);
  return token;
}

export function readGuestCartToken(): string | null {
  return localStorage.getItem(GUEST_CART_TOKEN_KEY);
}

export function readGuestCart(): CartItem[] {
  const storedCart = localStorage.getItem(GUEST_CART_KEY);
  if (!storedCart) return [];

  try {
    const items = JSON.parse(storedCart) as CartItem[];
    return Array.isArray(items) ? items : [];
  } catch {
    clearGuestCart();
    return [];
  }
}

export function saveGuestCart(items: CartItem[]): void {
  if (items.length === 0) {
    clearGuestCart();
    return;
  }

  getOrCreateGuestCartToken();
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function clearGuestCart(): void {
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(GUEST_CART_TOKEN_KEY);
}
