"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useNotifications, useMarkAsRead, Notification } from "@/lib/hooks/useNotifications";
import { LoadingCard } from "@/components/ui/Loading";

function NotificationDropdownContent() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { unreadCount } = useSocket();
  const { data, isLoading, refetch } = useNotifications({ limit: 10 });
  const markAsReadMutation = useMarkAsRead();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    // Close dropdown first
    setIsOpen(false);

    // Redirect to notifications page with notification ID
    router.push(`/dashboard/student/notifications?notification=${notification.id}`);

    // Mark as read in background if not already read
    if (!notification.is_read) {
      markAsReadMutation.mutate(
        notification.id,
        {
          onSuccess: () => {
            refetch();
          },
          onError: () => {
            console.error("Failed to mark notification as read");
          },
        }
      );
    }
  };

  const handleViewAll = () => {
    router.push("/dashboard/student/notifications");
    setIsOpen(false);
  };

  const apiUnreadCount = data?.unreadCount || 0;
  const unreadNotifications = data?.notifications?.filter(n => !n.is_read) || [];
  const displayUnreadCount = apiUnreadCount > 0 ? apiUnreadCount : unreadNotifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refetch();
        }}
        className="relative flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card/50 hover:bg-card transition-colors"
      >
        <Bell size={20} className="text-secondary" />
        {displayUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {displayUnreadCount > 9 ? "9+" : displayUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[500px] rounded-2xl overflow-hidden bg-white border border-border shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-bold text-primary">Notifications</h3>
            {displayUnreadCount > 0 && <span className="text-xs text-secondary">{displayUnreadCount} unread</span>}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <LoadingCard />
                <LoadingCard />
              </div>
            ) : unreadNotifications.length > 0 ? (
              unreadNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-[#FDF9F0] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        notification.type === "ALERT" || notification.type === "OVERDUE"
                          ? "bg-red-500"
                          : notification.type === "REMINDER"
                            ? "bg-yellow-500"
                            : notification.type === "NEW_BOOK"
                              ? "bg-green-500"
                              : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm line-clamp-2 ${
                          !notification.is_read ? "font-medium text-primary" : "text-secondary"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        {new Date(notification.created_at).toLocaleDateString()} • {notification.type}
                      </p>
                    </div>
                    {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-secondary text-sm">No unread notifications</div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:text-accent transition-colors"
            >
              View All Notifications
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationDropdown() {
  return (
    <Suspense fallback={
      <button className="relative flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card/50 hover:bg-card transition-colors">
        <Bell size={20} className="text-secondary" />
      </button>
    }>
      <NotificationDropdownContent />
    </Suspense>
  );
}
