import { httpRequest } from "../../../shared/services/httpClient";

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
