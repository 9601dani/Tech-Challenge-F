import type { ProductCardData } from "../types/catalog.types";

export const catalogCategories = ["Todos", "Ropa", "Hamburguesas", "Bebidas", "Alimentos"];

export const catalogMock: ProductCardData[] = [
  { id: 1, name: "Camisa básica negra", category: "Ropa", price: 125, sku: "CAM-NEG-S", isComposite: false, showPos: true, color: "#27272a", badge: "Más vendido" },
  { id: 2, name: "Camisa básica blanca", category: "Ropa", price: 135, sku: "CAM-BLA-M", isComposite: false, showPos: true, color: "#e2e8f0" },
  { id: 3, name: "Hamburguesa clásica", category: "Hamburguesas", price: 45, sku: "HAMB-CLASICA", isComposite: true, showPos: true, color: "#d97706", badge: "Favorito" },
  { id: 4, name: "Hamburguesa con queso", category: "Hamburguesas", price: 52, sku: "HAMB-QUESO", isComposite: true, showPos: true, color: "#f59e0b" },
  { id: 5, name: "Café americano", category: "Bebidas", price: 18, sku: "CAFE-AMERICANO-DEFAULT", isComposite: false, showPos: true, color: "#78350f" },
  { id: 6, name: "Pan para hamburguesa", category: "Alimentos", price: 3, sku: "MP-PAN-DEFAULT", isComposite: false, showPos: true, color: "#fbbf24" },
];
