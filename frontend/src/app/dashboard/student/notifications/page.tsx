"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, Notification } from "@/lib/hooks/useNotifications";
import { LoadingList } from "@/components/ui/Loading";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border border-border/60 p-4 flex items-start justify-between gap-4 hover:shadow-md transition-all ${
        !notification.is_read ? "border-l-4 border-l-blue-500" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
              notification.type === "ALERT" || notification.type === "OVERDUE"
                ? "bg-red-100 text-red-700"
                : notification.type === "REMINDER"
                  ? "bg-yellow-100 text-yellow-700"
                  : notification.type === "NEW_BOOK"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
            }`}
          >
            {notification.type}
          </span>
          {!notification.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
        </div>
        <p className="text-sm font-medium text-primary line-clamp-2">{notification.message}</p>
        <p className="text-xs text-secondary mt-2">{new Date(notification.created_at).toLocaleString()}</p>
      </div>
    </button>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationId = searchParams.get("notification");

  const { data, isLoading, refetch } = useNotifications({ limit: 50 });
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // DERIVED STATE: The overlay visibility and data are calculated directly from the URL.
  // This eliminates the "vibration" caused by race conditions between state and URL.
  const activeNotification = useMemo(() => {
    if (!notificationId || !data?.notifications) return null;
    return data.notifications.find((n) => n.id === notificationId) || null;
  }, [notificationId, data]);

  const handleMarkAll = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success("All notifications marked as read");
      await refetch();
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to set the ID in URL, triggering the overlay via useMemo
    router.replace(`/dashboard/student/notifications?notification=${notification.id}`, { scroll: false });

    // Mark as read in the background
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id, { onSuccess: () => refetch() });
    }
  };

  const handleCloseOverlay = () => {
    // Remove the ID from URL, causing activeNotification to become null and closing the overlay
    router.replace("/dashboard/student/notifications", { scroll: false });
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Notifications</h1>
          <p className="text-secondary font-medium">Stay updated with due reminders and library updates.</p>
        </div>
        {data && data.unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markAllAsReadMutation.isPending}
            className="px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
          >
            {markAllAsReadMutation.isPending ? "Marking..." : "Mark All Read"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <LoadingList count={5} />
        ) : data?.notifications && data.notifications.length > 0 ? (
          <div className="grid gap-3">
            {data.notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-secondary text-sm bg-[#FDF9F0] rounded-2xl">
            No notifications found.
          </div>
        )}
      </div>

      {/* The overlay now reacts directly to the activeNotification variable.
        Because there is no internal state being toggled, the render cycle is clean.
      */}
      <NotificationOverlay
        notification={activeNotification}
        isOpen={!!activeNotification}
        onClose={handleCloseOverlay}
        refetch={refetch}
      />
    </div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12">
          <LoadingList count={5} />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
