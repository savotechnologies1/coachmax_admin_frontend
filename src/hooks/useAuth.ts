import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  login,
  registerUser,
  logout,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
} from "../api/auth";
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

export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AuthResponse, Error, SignInCredentials>({
    mutationFn: login,
    onSuccess: (response) => {
      const token = response.token || response.data?.token || "";
      const user = response.admin || response.user || response.data?.user;
      
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));
      
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useRegisterUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AuthResponse, Error, SignUpCredentials>({
    mutationFn: registerUser,
    onSuccess: (response) => {
      const token = response.token || response.data?.token || "";
      const user = response.admin || response.user || response.data?.user;
      
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));
      
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, void>({
    mutationFn: logout,
    onSuccess: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      queryClient.clear();
    },
  });
};

export const useForgotPassword = () => {
  return useMutation<ForgotPasswordResponse, Error, ForgotPasswordRequest>({
    mutationFn: forgotPassword,
  });
};

export const useResendOtp = () => {
  return useMutation<MessageResponse, Error, ResendOtpRequest>({
    mutationFn: resendOtp,
  });
};

export const useVerifyOtp = () => {
  return useMutation<MessageResponse, Error, VerifyOtpRequest>({
    mutationFn: verifyOtp,
  });
};

export const useResetPassword = () => {
  return useMutation<MessageResponse, Error, ResetPasswordRequest>({
    mutationFn: resetPassword,
  });
};

export const useProfile = () => {
  return useQuery<UserProfileResponse, Error>({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled: !!localStorage.getItem("token"),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<UserProfileResponse, Error, { data: UpdateProfileRequest; imageFile?: File }>({
    mutationFn: ({ data, imageFile }) => updateProfile(data, imageFile),
    onSuccess: (response) => {
      localStorage.setItem("user", JSON.stringify(response.data));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation<MessageResponse, Error, { oldPassword: string; newPassword: string }>({
    mutationFn: changePassword,
  });
};
