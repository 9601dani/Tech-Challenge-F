import { httpRequest } from "../../../shared/services/httpClient";
export type CouponDiscountType = "PERCENTAGE" | "FIXED";
export interface Coupon { id: number; code: string; discountType: CouponDiscountType; discountValue: number; startDate: string; endDate: string; minimumPurchase: number; totalUsageLimit: number | null; usageCount: number; usageLimitPerCustomer: number | null; active: boolean; categoryIds: number[]; }
export interface CouponInput { code: string; discountType: CouponDiscountType; discountValue: number; startDate: string; endDate: string; minimumPurchase: number; totalUsageLimit?: number; usageLimitPerCustomer?: number; categoryIds?: number[]; }
export function listCoupons(includeInactive = false): Promise<Coupon[]> {
  return httpRequest<Coupon[]>(`/coupons?includeInactive=${includeInactive}`);
}
export function createCoupon(input: CouponInput): Promise<Coupon> { return httpRequest<Coupon>("/coupons", { method: "POST", body: JSON.stringify(input) }); }
export function updateCoupon(id: number, input: CouponInput): Promise<void> { return httpRequest<void>(`/coupons/${id}`, { method: "PUT", body: JSON.stringify(input) }); }
export function deactivateCoupon(id: number): Promise<void> { return httpRequest<void>(`/coupons/${id}`, { method: "DELETE" }); }
