"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, X } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAllNotifications, useMarkAsRead, Notification } from "@/lib/hooks/useNotifications";
import { LoadingCard } from "@/components/ui/Loading";
import { toast } from "sonner";

export function AdminNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { unreadCount, setUnreadCount } = useSocket();
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

  // Handle notification click - show overlay directly
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
        // Optimistically update local state
        setUnreadCount(Math.max(0, unreadCount - 1));
        await refetch();
        toast.success("Notification marked as read");
      } catch {
        toast.error("Failed to mark as read");
      }
    }
    // Show overlay directly
    setSelectedNotification(notification);
    setShowOverlay(true);
    setIsOpen(false);
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    setSelectedNotification(null);
  };

  const handleViewAll = () => {
    router.push("/dashboard/admin/alerts?tab=notifications");
    setIsOpen(false);
  };

  const displayUnreadCount = data?.unreadCount ?? unreadCount;
  
  // Only show unread notifications in the dropdown
  const unreadNotifications = data?.notifications?.filter(n => !n.is_read) || [];

  return (
    <>
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

      {/* Notification Detail Overlay - 40% from right */}
      {showOverlay && selectedNotification && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={handleCloseOverlay} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[40%] max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1D2BD]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#2B1A10]">Notification Details</h2>
                {!selectedNotification.is_read && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Unread</span>
                )}
              </div>
              <button
                onClick={handleCloseOverlay}
                aria-label="Close notification details"
                className="p-2 rounded-full hover:bg-[#F3EFE6] transition-colors"
              >
                <X size={20} className="text-[#AE9E85]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      selectedNotification.type === "ALERT" || selectedNotification.type === "OVERDUE"
                        ? "bg-red-100 text-red-700"
                        : selectedNotification.type === "REMINDER"
                          ? "bg-yellow-100 text-yellow-700"
                          : selectedNotification.type === "NEW_BOOK"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {selectedNotification.type}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-[#AE9E85]">
                    {new Date(selectedNotification.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-[#2B1A10] text-base leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>

                {selectedNotification.user && (
                  <div className="pt-4 border-t border-[#E1D2BD]">
                    <p className="text-xs text-[#AE9E85]">From: {selectedNotification.user.name}</p>
                    <p className="text-xs text-[#AE9E85]">{selectedNotification.user.email}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E1D2BD]">
              <button
                onClick={handleViewAll}
                className="w-full py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl hover:bg-[#3B2718] transition-colors"
              >
                View All Notifications
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
