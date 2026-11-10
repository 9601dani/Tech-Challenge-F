import { httpRequest } from "../../../shared/services/httpClient";
import type { CustomerAddress } from "../../customer/services/customerApi";

export interface CheckoutCustomer { id: number; identification: string | null; name: string; email: string | null; phone: string | null; }
export function findCheckoutCustomer(identification: string): Promise<CheckoutCustomer | null> { return httpRequest<CheckoutCustomer | null>(`/customers/checkout/lookup?identification=${encodeURIComponent(identification.trim())}`); }
export function listCheckoutAddresses(customerId: number): Promise<CustomerAddress[]> { return httpRequest<CustomerAddress[]>(`/customers/checkout/${customerId}/addresses`); }
export function createCheckoutAddress(customerId: number, input: Omit<CustomerAddress, "id" | "customerId" | "active" | "createdAt" | "updatedAt">): Promise<CustomerAddress> { return httpRequest<CustomerAddress>(`/customers/checkout/${customerId}/addresses`, { method: "POST", body: JSON.stringify(input) }); }
