import { httpRequest } from "../../../shared/services/httpClient";

export interface InventoryStockItem {
  id: number;
  variantId: number;
  sku: string;
  variantName: string | null;
  warehouseId: number;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastMovementAt: string | null;
}

export interface InventoryMovementItem {
  id: number;
  variantId: number;
  sku: string;
  variantName: string | null;
  warehouseId: number;
  movementType: string;
  quantity: number;
  unitCost: number | null;
  reason: string;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
  createdBy: number | null;
}

export type InventoryMovementType = "ENTRY" | "EXIT";

export async function listInventoryStock(): Promise<InventoryStockItem[]> {
  const response = await httpRequest<InventoryStockItem[]>("/inventory/stock");
  return response.map((item) => ({ ...item, id: Number(item.id), variantId: Number(item.variantId), warehouseId: Number(item.warehouseId), physicalQuantity: Number(item.physicalQuantity), reservedQuantity: Number(item.reservedQuantity), availableQuantity: Number(item.availableQuantity) }));
}

export async function getInventoryKardex(variantId: number, warehouseId?: number): Promise<InventoryMovementItem[]> {
  const query = new URLSearchParams({ variantId: String(variantId) });
  if (warehouseId) query.set("warehouseId", String(warehouseId));
  const response = await httpRequest<InventoryMovementItem[]>(`/inventory/kardex?${query.toString()}`);
  return response.map((item) => ({ ...item, id: Number(item.id), variantId: Number(item.variantId), warehouseId: Number(item.warehouseId), quantity: Number(item.quantity), unitCost: item.unitCost === null ? null : Number(item.unitCost), createdBy: item.createdBy === null ? null : Number(item.createdBy) }));
}

export async function registerInventoryMovement(input: {
  movementType: InventoryMovementType;
  variantId: number;
  warehouseId: number;
  quantity: number;
  reason: string;
  unitCost?: number;
}): Promise<InventoryStockItem> {
  const response = await httpRequest<InventoryStockItem>("/inventory/movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { ...response, id: Number(response.id), variantId: Number(response.variantId), warehouseId: Number(response.warehouseId), physicalQuantity: Number(response.physicalQuantity), reservedQuantity: Number(response.reservedQuantity), availableQuantity: Number(response.availableQuantity) };
}
