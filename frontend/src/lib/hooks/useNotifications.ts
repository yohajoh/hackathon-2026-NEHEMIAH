import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
  alertCount?: number;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Query key factory for better caching
export const notificationKeys = {
  all: ["notifications"] as const,
  mine: (options?: { limit?: number; isRead?: boolean; type?: string }) => ["notifications", "mine", options] as const,
  allAdmin: (options?: { limit?: number; isRead?: boolean; type?: string; userId?: string }) =>
    ["notifications", "all", options] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
};

export function useNotifications(options?: { limit?: number; isRead?: boolean; type?: string }) {
  return useQuery<NotificationsResponse>({
    queryKey: notificationKeys.mine(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.isRead !== undefined) params.set("is_read", String(options.isRead));
      if (options?.type) params.set("type", options.type);

      const res = await fetchApi(`/notifications/mine?${params.toString()}`);
      return {
        notifications: res.notifications || [],
        unreadCount: res.unreadCount || 0,
        alertCount: res.alertCount || 0,
        meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useAllNotifications(options?: { limit?: number; isRead?: boolean; type?: string; userId?: string }) {
  return useQuery<NotificationsResponse>({
    queryKey: notificationKeys.allAdmin(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.isRead !== undefined) params.set("is_read", String(options.isRead));
      if (options?.type) params.set("type", options.type);
      if (options?.userId) params.set("user_id", options.userId);

      const res = await fetchApi(`/notifications?${params.toString()}`);
      return {
        notifications: res.notifications || [],
        unreadCount: res.unreadCount || 0,
        meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/notifications/${id}/read`, { method: "PATCH" });
    },
    // Optimistic update
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.all);
      const previousMineNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.mine());

      // Optimistically update my notifications
      if (previousMineNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.mine(), (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        });
      }

      // Optimistically update all notifications
      if (previousNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.allAdmin(), (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        });
      }

      return { previousNotifications, previousMineNotifications };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousMineNotifications) {
        queryClient.setQueryData(notificationKeys.mine(), context.previousMineNotifications);
      }
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.allAdmin(), context.previousNotifications);
      }
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return fetchApi("/notifications/mine/read-all", { method: "PATCH" });
    },
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousMineNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.mine());

      if (previousMineNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.mine(), (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, is_read: true })),
            unreadCount: 0,
          };
        });
      }

      return { previousMineNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMineNotifications) {
        queryClient.setQueryData(notificationKeys.mine(), context.previousMineNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/notifications/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
