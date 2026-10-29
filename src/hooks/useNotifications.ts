import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/adminApi";
import { getCoachNotifications, markCoachNotificationAsRead } from "../api/coaches";

export interface NotificationData {
  parentId?: string;
  playerId?: string;
  requestType?: string;
  classId?: string;
  sessionDate?: string;
  reason?: string;
  invoiceId?: string;
  paymentId?: string;
  orderId?: string;
}

export interface Notification {
  _id: string;
  recipientType: string;
  parent: string | null;
  admin: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  data: NotificationData;
  createdAt: string;
  updatedAt: string;
}

// Map notification type to a redirect path
export function getNotificationRedirectPath(notification: Notification): string {
  const { type, data } = notification;

  switch (type) {
    case "ENROLLMENT_REQUEST":
      return "/new-registration-request";
    case "ATTENDANCE_ALERT":
      return "/program/academy";
    case "PAYMENT_SUBMITTED":
      return data?.invoiceId ? `/invoices/${data.invoiceId}` : "/invoices";
    case "ANNOUNCEMENT":
      return data?.orderId ? `/orders/${data.orderId}` : "/orders";
    default:
      return "/notifications";
  }
}

// Just map the style config and an icon name so UI components can render the actual SVGs
export function getNotificationStyle(type: string): { bg: string; iconName: string } {
  switch (type) {
    case "ENROLLMENT_REQUEST":
      return { bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", iconName: "document" };
    case "ATTENDANCE_ALERT":
      return { bg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", iconName: "calendar-minus" };
    case "PAYMENT_SUBMITTED":
      return { bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", iconName: "receipt" };
    case "ANNOUNCEMENT":
      return { bg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", iconName: "cart" };
    default:
      return { bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", iconName: "bell" };
  }
}

export const useNotifications = () => {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const userStr = localStorage.getItem("user");
      let isCoach = false;
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed?.role === "COACH") {
            isCoach = true;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (isCoach) {
        const response = await getCoachNotifications();
        return response?.data || [];
      }
      const response = await getNotifications();
      return response?.data || [];
    },
    refetchInterval: 30000,
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userStr = localStorage.getItem("user");
      let isCoach = false;
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed?.role === "COACH") {
            isCoach = true;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (isCoach) {
        // Fetch current unread notifications and mark them as read one by one
        const activeUnreadsRes = await getCoachNotifications();
        const unreadList = (activeUnreadsRes?.data || []).filter((n: any) => !n.isRead);
        for (const item of unreadList) {
          await markCoachNotificationAsRead(item._id);
        }
        return;
      }

      return markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const userStr = localStorage.getItem("user");
      let isCoach = false;
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed?.role === "COACH") {
            isCoach = true;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (isCoach) {
        return markCoachNotificationAsRead(notificationId);
      }
      return markNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

