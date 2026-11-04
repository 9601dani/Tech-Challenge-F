import { httpRequest } from "../../../shared/services/httpClient";
import type { AuthResponse, LoginRequest } from "../types/auth.types";

export function login(request: LoginRequest): Promise<AuthResponse> {
  return httpRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
