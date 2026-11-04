export interface Permission {
  feature: string;
  enabled: boolean;
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    companyId: number;
    email: string;
    roles: string[];
  };
  permissions: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
}
