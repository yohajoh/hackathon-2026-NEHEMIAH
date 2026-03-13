"use client";

import { X, Calendar, Check } from "lucide-react";
import { Notification, useMarkAsRead } from "@/lib/hooks/useNotifications";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface NotificationOverlayProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  refetch?: () => void;
}

export function NotificationOverlay({ notification, isOpen, onClose, refetch }: NotificationOverlayProps) {
  const { t } = useLanguage();
  const markAsReadMutation = useMarkAsRead();

  // If the overlay shouldn't be open, we render nothing.
  // This prevents the "vibration" by ensuring no ghost renders occur.
  if (!isOpen || !notification) return null;

  const handleMarkAsRead = async () => {
    try {
      await markAsReadMutation.mutateAsync(notification.id);
      toast.success(t("student_notifications.mark_as_read_success"));
      if (refetch) refetch();
    } catch {
      toast.error(t("student_notifications.mark_as_read_error"));
    }
  };

  return (
    <div className="fixed inset-0 z-2147483646 flex justify-end">
      {/* Backdrop: Clicking once calls onClose, which clears the URL */}
      <div className="absolute inset-0 bg-black/40 transition-opacity animate-in fade-in duration-200" onClick={onClose} />

      {/* Overlay Panel */}
      <div
        className="relative z-10 h-full w-full sm:w-[50%] max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the panel
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#FFFFFF]">
          <h2 className="text-lg font-bold text-[#111111]">{t("student_notifications.detail_title")}</h2>
          <button onClick={onClose} title="Close" aria-label="Close" className="p-2 rounded-full hover:bg-[#E1DEE5] transition-colors">
            <X size={24} className="text-[#142B6F]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <span className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700 w-fit">
            {notification.type}
          </span>

          <div className="text-sm text-[#142B6F] flex items-center gap-2">
            <Calendar size={14} />
            {new Date(notification.created_at).toLocaleString()}
          </div>

          <p className="text-[#111111] text-base leading-relaxed whitespace-pre-wrap">{notification.message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-[#FFFFFF]">
          {!notification.is_read ? (
            <button
              onClick={handleMarkAsRead}
              disabled={markAsReadMutation.isPending}
              className="w-full py-3 bg-[#142B6F] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {markAsReadMutation.isPending ? t("student_notifications.marking") : t("student_notifications.mark_as_read")}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-600 py-2">
              <Check size={18} />
              <span className="font-medium text-sm">{t("student_notifications.read_status")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
