"use client";

import { useState } from "react";
import { X, Calendar, Check } from "lucide-react";
import { Notification, useMarkAsRead } from "@/lib/hooks/useNotifications";
import { toast } from "sonner";

interface NotificationOverlayProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  refetch?: () => void;
}

export function NotificationOverlay({ notification, isOpen, onClose, refetch }: NotificationOverlayProps) {
  const markAsReadMutation = useMarkAsRead();
  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  if (!isOpen || !notification) return null;

  const handleMarkAsRead = async () => {
    if (!notification.is_read && !hasMarkedRead) {
      setHasMarkedRead(true);
      try {
        await markAsReadMutation.mutateAsync(notification.id);
        toast.success("Notification marked as read");
        if (refetch) {
          refetch();
        }
      } catch {
        toast.error("Failed to mark as read");
      }
    }
  };

  const isRead = notification.is_read || hasMarkedRead;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full sm:w-[40%] max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-primary">Notification Details</h2>
            {!isRead && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Unread</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close notification details"
            className="p-2 rounded-full hover:bg-[#F3EFE6] transition-colors"
          >
            <X size={20} className="text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-lg ${
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
            </div>

            <div className="space-y-2">
              <p className="text-sm text-secondary flex items-center gap-2">
                <Calendar size={14} />
                {new Date(notification.created_at).toLocaleDateString("en-US", {
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
              <p className="text-primary text-base leading-relaxed whitespace-pre-wrap">{notification.message}</p>
            </div>

            {notification.user && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-secondary">From: {notification.user.name}</p>
                <p className="text-xs text-secondary">{notification.user.email}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border">
          {!isRead && (
            <button
              onClick={handleMarkAsRead}
              disabled={markAsReadMutation.isPending}
              className="w-full py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
            >
              {markAsReadMutation.isPending ? "Marking..." : "Mark as Read"}
            </button>
          )}
          {isRead && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Check size={16} />
              <span className="text-sm font-medium">You have read this notification</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
