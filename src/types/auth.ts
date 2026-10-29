export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  parent: any;
  players: any[];
  profileImage?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  admin?: User;
  user?: User;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface SignInCredentials {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  name: string;
  email: string;
  password?: string;
}

export interface ForgotPasswordRequest {
  email: string;
  role: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  userId?: string;
  parent_id?: string;
}

export interface ResendOtpRequest {
  email: string;
  role: string;
}

export interface VerifyOtpRequest {
  userId: string;
  role: string;
  otp: string;
}

export interface ResetPasswordRequest {
  userId: string;
  role: string;
  newPassword?: string;
  resetToken: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
  resetToken?: string;
}

export interface UserProfileResponse {
  success: boolean;
  message: string;
  data: User;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  profileImage?: string;
}


