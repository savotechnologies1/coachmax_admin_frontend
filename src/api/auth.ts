import apiClient from "./apiClient";
import {
  SignInCredentials,
  SignUpCredentials,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResendOtpRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
  AuthResponse,
  MessageResponse,
  UserProfileResponse,
  UpdateProfileRequest,
} from "../types/auth";

export const login = async (credentials: SignInCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/api/admin/login", credentials);
  return response.data;
};

export const registerUser = async (credentials: SignUpCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/register", credentials);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post("/api/admin/logout");
};

export const forgotPassword = async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
  const response = await apiClient.post<ForgotPasswordResponse>("/api/auth/forgotPassword", data);
  return response.data;
};

export const resendOtp = async (data: ResendOtpRequest): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/api/auth/resendOtp", data);
  return response.data;
};

export const verifyOtp = async (data: VerifyOtpRequest): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/api/auth/verifyOtp", data);
  return response.data;
};

export const resetPassword = async (data: ResetPasswordRequest): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/api/auth/resetPassword", data);
  return response.data;
};

export const getProfile = async (): Promise<UserProfileResponse> => {
  const response = await apiClient.get<UserProfileResponse>("/api/auth/getMyProfile");
  return response.data;
};

export const updateProfile = async (
  data: UpdateProfileRequest,
  imageFile?: File
): Promise<UserProfileResponse> => {
  if (imageFile) {
    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.email) formData.append("email", data.email);
    formData.append("profileImage", imageFile);
    const response = await apiClient.put<UserProfileResponse>("api/auth/updateMyProfile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
  const response = await apiClient.put<UserProfileResponse>("/api/auth/updateMyProfile", data);
  return response.data;
};

export const changePassword = async (data: { oldPassword: string; newPassword: string }): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>("/api/auth/changePassword", data);
  return response.data;
};
