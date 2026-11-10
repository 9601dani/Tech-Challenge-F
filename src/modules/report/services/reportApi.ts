import { httpRequest } from "../../../shared/services/httpClient";

export interface PeriodReport { period?: string; periodYear?: number; periodWeek?: number; periodMonth?: number; orderCount: number; netSales: number; }
export interface CategoryReport { categoryId: number | null; categoryName: string | null; netSales: number; netQuantity: number; }
export interface TopProductReport { productId: number; productName: string; variantName: string | null; variantId: number; sku: string; netQuantity: number; netSales: number; }
export interface ReportOrder { id: number; customerId: number | null; userId: number | null; status: string; saleDate: string | null; subtotal: number; discountAmount: number; taxAmount: number; total: number; customerName: string | null; identification: string | null; totalItems: number; }
export interface OrdersReportResponse { data: ReportOrder[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }
const range = (from: string, to: string) => new URLSearchParams({ from, to });
export function salesByDay(from: string, to: string) { return httpRequest<PeriodReport[]>(`/reports/sales/day?${range(from, to)}`); }
export function salesByWeek(from: string, to: string) { return httpRequest<PeriodReport[]>(`/reports/sales/week?${range(from, to)}`); }
export function salesByMonth(from: string, to: string) { return httpRequest<PeriodReport[]>(`/reports/sales/month?${range(from, to)}`); }
export function salesByCategory(from: string, to: string) { return httpRequest<CategoryReport[]>(`/reports/sales/category?${range(from, to)}`); }
export function topProducts(from: string, to: string) { return httpRequest<TopProductReport[]>(`/reports/sales/top-products?${range(from, to)}`); }
export function listReportOrders(params: { from: string; to: string; status?: string; customerId?: string; page: number; pageSize: number }) { const query = new URLSearchParams({ from: params.from, to: params.to, page: String(params.page), pageSize: String(params.pageSize) }); if (params.status) query.set("status", params.status); if (params.customerId) query.set("customerId", params.customerId); return httpRequest<OrdersReportResponse>(`/reports/orders?${query}`); }
