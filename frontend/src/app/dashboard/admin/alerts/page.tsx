"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { useNotifications, useMarkAsRead, Notification, useMarkAllAsRead } from "@/lib/hooks/useNotifications";
import { LoadingList } from "@/components/ui/Loading";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";

type Alert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  book: { title: string; available: number; copies: number };
};

type TabType = "alerts" | "notifications";

export function useInventoryAlerts() {
  return useQuery({
    queryKey: ["inventory-alerts"],
    queryFn: () => fetchApi("/admin/inventory-alerts?limit=200"),
    staleTime: 60 * 1000,
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/admin/inventory-alerts/${id}/resolve`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
}

export function useScanAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchApi("/admin/inventory-alerts/scan", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
}

function AlertsContent() {
  const [activeTab, setActiveTab] = useState<TabType>("alerts");
  const [overlayNotification, setOverlayNotification] = useState<Notification | null>(null);

  const { data: alertsData, isLoading: loadingAlerts } = useInventoryAlerts();
  const resolveAlert = useResolveAlert();
  const scanAlerts = useScanAlerts();

  const { data: notificationsData, isLoading: loadingNotifications, refetch } = useNotifications({ limit: 50 });
  const markAsReadMutation = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const alerts: Alert[] = alertsData?.alerts || [];

  const handleResolveAlert = async (id: string) => {
    await resolveAlert.mutateAsync(id);
  };

  const handleScanAlerts = async () => {
    await scanAlerts.mutateAsync();
  };

  const handleMarkAll = async () => {
    await markAllAsRead.mutateAsync();
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Auto-mark as read when viewing detail
    if (!notification.is_read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
        await refetch();
      } catch {
        // Continue even if mark as read fails
      }
    }
    setOverlayNotification(notification);
  };

  const handleCloseOverlay = () => {
    setOverlayNotification(null);
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Alerts & Notifications</h1>
          <p className="text-[#AE9E85] font-medium">Monitor inventory alerts and system notifications.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleScanAlerts} disabled={scanAlerts.isPending} className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50">
            {scanAlerts.isPending ? "Scanning..." : "Run Scan"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#E1D2BD]/50">
        <button onClick={() => setActiveTab("alerts")} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "alerts" ? "border-[#2B1A10] text-[#2B1A10]" : "border-transparent text-[#AE9E85] hover:text-[#2B1A10]"}`}>
          Inventory Alerts
        </button>
        <button onClick={() => { setActiveTab("notifications"); refetch(); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "notifications" ? "border-[#2B1A10] text-[#2B1A10]" : "border-transparent text-[#AE9E85] hover:text-[#2B1A10]"}`}>
          Notifications
          {notificationsData?.unreadCount && notificationsData.unreadCount > 0 && <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{notificationsData.unreadCount}</span>}
        </button>
      </div>

      {activeTab === "alerts" ? (
        <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_2.5fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase">
            <span>Type</span>
            <span>Severity</span>
            <span>Message</span>
            <span>Book</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {loadingAlerts ? (
            <div className="py-16 text-center text-[#AE9E85] text-sm"><LoadingList count={3} /></div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center text-[#AE9E85] text-sm">No alerts</div>
          ) : (
            alerts.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_1fr_2.5fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30">
                <span className="text-sm text-[#2B1A10]">{item.type}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] text-[#2B1A10] w-fit">{item.severity}</span>
                <p className="text-sm text-[#2B1A10]/80 line-clamp-2">{item.message}</p>
                <span className="text-sm text-[#2B1A10]/70">{item.book?.title || "-"}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${item.is_resolved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{item.is_resolved ? "Resolved" : "Open"}</span>
                <button onClick={() => handleResolveAlert(item.id)} disabled={item.is_resolved || resolveAlert.variables === item.id} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#2B1A10] border border-[#C2B199] rounded-lg disabled:opacity-40 hover:bg-[#F3EFE6]">
                  {resolveAlert.variables === item.id ? "Resolving..." : item.is_resolved ? "Resolved" : "Resolve"}
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            {notificationsData && notificationsData.unreadCount > 0 && (
              <button onClick={handleMarkAll} disabled={markAllAsRead.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50">
                {markAllAsRead.isPending ? "Marking..." : "Mark All Read"}
              </button>
            )}
          </div>
          {loadingNotifications ? (
            <LoadingList count={5} />
          ) : notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
            <div className="grid gap-3">
              {notificationsData.notifications.map((notification) => (
                <button key={notification.id} onClick={() => handleNotificationClick(notification)} className={`w-full text-left bg-white rounded-2xl border border-[#E1D2BD]/60 p-4 flex items-start justify-between gap-4 hover:shadow-md ${!notification.is_read ? "border-l-4 border-l-blue-500" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${notification.type === "ALERT" || notification.type === "OVERDUE" ? "bg-red-100 text-red-700" : notification.type === "REMINDER" ? "bg-yellow-100 text-yellow-700" : notification.type === "NEW_BOOK" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{notification.type}</span>
                      {!notification.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                    <p className="text-sm font-medium text-[#2B1A10] line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-[#AE9E85] mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-[#AE9E85] text-sm bg-white rounded-2xl border border-[#E1D2BD]/50">No notifications found.</div>
          )}
        </div>
      )}

      <NotificationOverlay notification={overlayNotification} isOpen={!!overlayNotification} onClose={handleCloseOverlay} refetch={refetch} />
    </div>
  );
}

function AlertsLoading() {
  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="h-12 w-80 bg-[#E1D2BD]/30 rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-[#E1D2BD]/30 rounded-lg animate-pulse" />
        </div>
      </div>
      <LoadingList count={5} />
    </div>
  );
}

export default function AdminAlertsPage() {
  return <AlertsContent />;
}
