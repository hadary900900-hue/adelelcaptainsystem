export interface LoginRequest {
  email?: string;
  password?: string;
}

export interface AuthBranch {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  isDefault: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string | null;
  avatar: string | null;
  preferredLang: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  branches: AuthBranch[];
  activeBranchId: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TokenPayload {
  userId: string;
  organizationId: string;
  activeBranchId: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
}

export interface ForgotPasswordRequest {
  email?: string;
}

export interface ResetPasswordRequest {
  token?: string;
  newPassword?: string;
}
