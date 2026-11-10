import { httpRequest } from "../../../shared/services/httpClient";

export interface Customer {
  id: number;
  userId: number;
  identification: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

export interface CustomerInput {
  identification: string;
  name: string;
  email?: string;
  phone?: string;
}

export function getMyCustomer(): Promise<Customer | null> {
  return httpRequest<Customer[]>("/customers").then((customers) => customers[0] ?? null);
}

export function updateMyCustomer(customerId: number, input: CustomerInput): Promise<Customer> {
  return httpRequest<Customer>(`/customers/${customerId}`, { method: "PUT", body: JSON.stringify(input) });
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  alias: string | null;
  addressLine: string;
  department: string | null;
  municipality: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
  active: boolean;
}

export interface CustomerAddressInput {
  alias?: string;
  addressLine: string;
  department?: string;
  municipality?: string;
  postalCode?: string;
  countryCode: string;
  isDefault: boolean;
}

export function listMyAddresses(): Promise<CustomerAddress[]> {
  return httpRequest<CustomerAddress[]>("/customers/addresses");
}

export function createMyAddress(input: CustomerAddressInput): Promise<CustomerAddress> {
  return httpRequest<CustomerAddress>("/customers/addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMyAddress(addressId: number, input: CustomerAddressInput): Promise<CustomerAddress> {
  return httpRequest<CustomerAddress>(`/customers/addresses/${addressId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteMyAddress(addressId: number): Promise<void> {
  return httpRequest<void>(`/customers/addresses/${addressId}`, { method: "DELETE" });
}
