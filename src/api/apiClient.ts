import axios from "axios";
import { toast } from "react-hot-toast";

// Create custom Axios instance
const apiClient = axios.create({
  baseURL:
    (import.meta.env.VITE_API_BASE_URL as string) ||
    (import.meta.env.PROD ? "https://coachmax.server24.in" : window.location.origin),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Interceptor for adding Auth token to headers
apiClient.interceptors.request.use(
  (config) => {
    // Let the browser set the multipart boundary for FormData requests. A
    // global JSON content type (or a manually supplied multipart header without
    // its boundary) makes Multer receive an empty body, which looks like
    // required event fields such as `title` were never sent.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers?.delete("Content-Type");
    }
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper: extract the best error message (backend first, then fallback)
export const getErrorMessage = (error: any, fallback = "Something went wrong"): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

// Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response || error.message === "Network Error") {
      toast.error("Network error. Please check your connection.");
      (error as any)._handled = true;
    } else if (error.response.status === 401) {
      // Handle unauthorized/forbidden — clear token/user and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/signin";
    } else {
      // Show backend message if available, else a generic error
      const message = getErrorMessage(error);
      toast.error(message);
      (error as any)._handled = true;
    }
    return Promise.reject(error);
  }
);

export default apiClient;
