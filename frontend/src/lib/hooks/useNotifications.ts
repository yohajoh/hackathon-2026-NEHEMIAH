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

type NotificationsQueryOptions = {
  enabled?: boolean;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  mine: (options?: { limit?: number; isRead?: boolean; type?: string }) => ["notifications", "mine", options] as const,
  allAdmin: (options?: { limit?: number; isRead?: boolean; type?: string; userId?: string }) =>
    ["notifications", "all", options] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
};

export function useNotifications(
  options?: { limit?: number; isRead?: boolean; type?: string },
  queryOptions?: NotificationsQueryOptions
) {
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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useAllNotifications(
  options?: { limit?: number; isRead?: boolean; type?: string; userId?: string },
  queryOptions?: NotificationsQueryOptions
) {
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
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/notifications/${id}/read`, { method: "PATCH" });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.all);
      const previousMineNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.mine());

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
      if (context?.previousMineNotifications) {
        queryClient.setQueryData(notificationKeys.mine(), context.previousMineNotifications);
      }
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.allAdmin(), context.previousNotifications);
      }
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.all);
      const previousMineNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.mine());

      const removeNotification = (old: NotificationsResponse | undefined) => {
        if (!old) return old;
        const wasUnread = old.notifications.find(n => n.id === id && !n.is_read);
        return {
          ...old,
          notifications: old.notifications.filter(n => n.id !== id),
          unreadCount: wasUnread ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
        };
      };

      if (previousMineNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.mine(), removeNotification);
      }

      if (previousNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.allAdmin(), removeNotification);
      }

      return { previousNotifications, previousMineNotifications };
    },
    onError: (_err, _id, context) => {
      if (context?.previousMineNotifications) {
        queryClient.setQueryData(notificationKeys.mine(), context.previousMineNotifications);
      }
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.allAdmin(), context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useViewNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return fetchApi(`/notifications/mine/view/${id}`, { method: "PATCH" });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.all);
      const previousMineNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.mine());

      const markAsRead = (old: NotificationsResponse | undefined) => {
        if (!old) return old;
        const notification = old.notifications.find(n => n.id === id);
        if (!notification || notification.is_read) return old;
        
        return {
          ...old,
          notifications: old.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      };

      if (previousMineNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.mine(), markAsRead);
      }

      if (previousNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.allAdmin(), markAsRead);
      }

      return { previousNotifications, previousMineNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMineNotifications) {
        queryClient.setQueryData(notificationKeys.mine(), context.previousMineNotifications);
      }
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.allAdmin(), context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkMultipleAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      return fetchApi("/notifications/mine/read-multiple", {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      });
    },
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.all);
      const previousMineNotifications = queryClient.getQueryData<NotificationsResponse>(notificationKeys.mine());

      const markMultipleAsRead = (old: NotificationsResponse | undefined) => {
        if (!old) return old;
        const idsSet = new Set(ids);
        let unreadRemoved = 0;
        
        const updatedNotifications = old.notifications.map(n => {
          if (idsSet.has(n.id) && !n.is_read) {
            unreadRemoved++;
            return { ...n, is_read: true };
          }
          return n;
        });

        return {
          ...old,
          notifications: updatedNotifications,
          unreadCount: Math.max(0, old.unreadCount - unreadRemoved),
        };
      };

      if (previousMineNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.mine(), markMultipleAsRead);
      }

      if (previousNotifications) {
        queryClient.setQueryData<NotificationsResponse>(notificationKeys.allAdmin(), markMultipleAsRead);
      }

      return { previousNotifications, previousMineNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMineNotifications) {
        queryClient.setQueryData(notificationKeys.mine(), context.previousMineNotifications);
      }
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.allAdmin(), context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
