"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { useAllNotifications, useMarkAsRead, Notification } from "@/lib/hooks/useNotifications";
import { LoadingCard } from "@/components/ui/Loading";

export function AdminNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data, isLoading, refetch } = useAllNotifications({ limit: 10 });
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
    
    // Redirect to alerts page with notification ID
    router.push(`/dashboard/admin/alerts?tab=notifications&notification=${notification.id}`);

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
    router.push("/dashboard/admin/alerts?tab=notifications");
    setIsOpen(false);
  };

  const unreadNotifications = data?.notifications?.filter(n => !n.is_read) || [];
  const displayUnreadCount = data?.unreadCount || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refetch();
        }}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-10 h-10 rounded-full border border-[#C2B199] bg-[#FDF8F0] hover:bg-[#F3EFE6] transition-colors"
      >
        <Bell size={20} className="text-[#2B1A10]" />
        {displayUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {displayUnreadCount > 9 ? "9+" : displayUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[500px] overflow-hidden bg-white rounded-2xl border border-[#E1D2BD] shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E1D2BD]">
            <h3 className="font-bold text-[#2B1A10]">Notifications</h3>
            {displayUnreadCount > 0 && <span className="text-xs text-[#AE9E85]">{displayUnreadCount} unread</span>}
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
                  className="w-full text-left px-4 py-3 border-b border-[#E1D2BD]/50 hover:bg-[#FDFAF6] transition-colors bg-blue-50/50"
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
                      <p className="text-sm line-clamp-2 font-medium text-[#2B1A10]">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#AE9E85] mt-1">
                        {new Date(notification.created_at).toLocaleDateString()} • {notification.type}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-[#AE9E85] text-sm">No unread notifications</div>
            )}
          </div>

          <div className="p-3 border-t border-[#E1D2BD]">
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#2B1A10] hover:text-[#3B2718] transition-colors"
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
