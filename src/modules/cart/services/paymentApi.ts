import { httpRequest } from "../../../shared/services/httpClient";

export interface PaymentMethod { id: number; name: string; code: string; }
export interface PaymentRecord { id: number; paymentMethodId: number; paymentMethodName: string; paymentMethodCode: string; amount: number; reference: string | null; status: string; paidAt: string | null; }
export interface PaymentSummary { saleId: number; saleTotal: number; paidTotal: number; remainingAmount: number; isComplete: boolean; payments: PaymentRecord[]; }
export interface CheckoutStarted { saleId: number; status: "PENDING_PAYMENT"; expiresAt: string; }

export function startCheckout(): Promise<CheckoutStarted> { return httpRequest<CheckoutStarted>("/payments/cart/start", { method: "POST" }); }
export function listPaymentMethods(): Promise<PaymentMethod[]> { return httpRequest<PaymentMethod[]>("/payments/methods"); }
export function getPaymentSummary(): Promise<PaymentSummary> { return httpRequest<PaymentSummary>("/payments/cart"); }
export function registerPayment(paymentMethodId: number, amount: number, reference?: string): Promise<PaymentSummary> { return httpRequest<PaymentSummary>("/payments/cart", { method: "POST", body: JSON.stringify({ paymentMethodId, amount, reference: reference?.trim() || null }) }); }
export function clearPayments(): Promise<PaymentSummary> { return httpRequest<PaymentSummary>("/payments/cart", { method: "DELETE" }); }
export function cancelCheckout(): Promise<PaymentSummary> { return httpRequest<PaymentSummary>("/payments/cart/cancel", { method: "POST" }); }
export function expireCheckout(): Promise<{ saleId: number | null; status: "CANCELLED" | "NO_EXPIRED_CHECKOUT"; expiresAt: string | null }> { return httpRequest<{ saleId: number | null; status: "CANCELLED" | "NO_EXPIRED_CHECKOUT"; expiresAt: string | null }>("/payments/cart/expire", { method: "POST" }); }
