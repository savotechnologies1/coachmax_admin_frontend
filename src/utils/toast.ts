import { toast } from "react-hot-toast";

export const successToast = (msg: string) => toast.success(msg);
export const errorToast = (msg: string) => toast.error(msg);
export const warnToast = (msg: string) =>
  toast(msg, {
    icon: "⚠️",
    style: { background: "#fbbf24", color: "#1e293b" },
  });
export const infoToast = (msg: string) => toast(msg, { icon: "ℹ️" });

/**
 * Returns true if the global apiClient interceptor already showed a toast for this error.
 */
export const isHttpError = (error: any): boolean =>
  !!(error?.response) || !!(error?._handled);

/**
 * Smart error toast — shows only ONE message per error:
 * - If the global interceptor already handled it (backend message shown), does nothing.
 * - Otherwise shows the provided fallback message.
 *
 * Use this in every catch block instead of toast.error("...").
 */
export const smartErrorToast = (error: any, fallback = "Something went wrong") => {
  if ((error as any)?._handled) return; // interceptor already showed the backend message
  toast.error(fallback);
};
