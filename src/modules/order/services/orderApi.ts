import { httpRequest } from "../../../shared/services/httpClient";

export interface OrderListItem {
  id: number;
  companyId: number;
  branchId: number | null;
  customerId: number | null;
  userId: number | null;
  status: string;
  saleDate: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  totalItems?: number;
}

export interface OrdersResponse {
  data: OrderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface OrderDetail extends OrderListItem {
  addressId: number | null;
  updatedAt: string;
  items: Array<{
    id: number;
    variantId: number;
    sku: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export async function listOrders(status = "", page = 1, pageSize = 10): Promise<OrdersResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) query.set("status", status);
  return httpRequest<OrdersResponse>(`/orders?${query.toString()}`);
}

export async function listMyOrders(status = "", page = 1, pageSize = 10): Promise<OrdersResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) query.set("status", status);
  return httpRequest<OrdersResponse>(`/orders/my?${query.toString()}`);
}

export async function getMyOrderById(orderId: number): Promise<OrderDetail> {
  return httpRequest<OrderDetail>(`/orders/my/${orderId}`);
}

export async function cancelMyOrder(orderId: number): Promise<{ orderId: number; previousStatus: string; status: string }> {
  return httpRequest<{ orderId: number; previousStatus: string; status: string }>(`/orders/my/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ comment: "Pedido cancelado por el cliente" }),
  });
}

export async function getOrderById(orderId: number): Promise<OrderDetail> {
  return httpRequest<OrderDetail>(`/orders/${orderId}`);
}

export async function changeOrderStatus(orderId: number, status: string): Promise<{ orderId: number; previousStatus: string; status: string }> {
  return httpRequest<{ orderId: number; previousStatus: string; status: string }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(orderId: number): Promise<{ orderId: number; previousStatus: string; status: string }> {
  return httpRequest<{ orderId: number; previousStatus: string; status: string }>(`/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ comment: "Pedido cancelado desde la gestión de pedidos" }),
  });
}
