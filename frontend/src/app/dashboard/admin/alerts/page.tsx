"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useNotifications, useMarkAsRead, Notification } from "@/lib/hooks/useNotifications";
import { LoadingList } from "@/components/ui/Loading";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
    queryFn: () => fetchApi<{ alerts?: Alert[]; data?: { alerts?: Alert[] } }>("/admin/inventory-alerts?limit=200"),
    staleTime: 60 * 1000,
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/admin/inventory-alerts/${id}/resolve`, { method: "PATCH" }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["inventory-alerts"] });
      const previousAlertsQueries = queryClient.getQueriesData<{ alerts?: Alert[]; data?: { alerts?: Alert[] } }>({
        queryKey: ["inventory-alerts"],
      });

      queryClient.setQueriesData<{ alerts?: Alert[]; data?: { alerts?: Alert[] } }>({ queryKey: ["inventory-alerts"] }, (old) => {
        if (!old) return old;
        const alerts = old.alerts || old.data?.alerts || [];
        const updated = alerts.map((a) => (a.id === id ? { ...a, is_resolved: true } : a));
        if (old.alerts) return { ...old, alerts: updated };
        return { ...old, data: { ...(old.data || {}), alerts: updated } };
      });

      return { previousAlertsQueries };
    },
    onError: (_err, _id, context) => {
      if (context?.previousAlertsQueries) {
        context.previousAlertsQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
}

export function useScanAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchApi("/admin/inventory-alerts/scan", { method: "POST" }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
}

function AlertsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // URL States - Source of Truth
  const notificationId = searchParams.get("notification");
  const activeTab = (searchParams.get("tab") as TabType) || "alerts";

  const { data: alertsData, isLoading: loadingAlerts } = useInventoryAlerts();
  const resolveAlert = useResolveAlert();
  const scanAlerts = useScanAlerts();

  const {
    data: notificationsData,
    isLoading: loadingNotifications,
    refetch: refetchNotifications,
  } = useNotifications({ limit: 50 }, { enabled: activeTab === "notifications" });

  const markAsReadMutation = useMarkAsRead();
  // Find the notification directly from the data using the URL ID
  const activeNotification = useMemo(() => {
    if (!notificationId || !notificationsData?.notifications) return null;
    return notificationsData.notifications.find((n) => n.id === notificationId) || null;
  }, [notificationId, notificationsData]);

  const handleNotificationClick = (notification: Notification) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("notification", notification.id);
    params.set("tab", "notifications");
    router.push(`?${params.toString()}`, { scroll: false });

    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleScanAlerts = async () => {
    try {
      await scanAlerts.mutateAsync();
      toast.success(t("admin_alerts.messages.scan_success"));
    } catch {
      toast.error(t("admin_alerts.messages.scan_failed"));
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await resolveAlert.mutateAsync(id);
      toast.success(t("admin_alerts.messages.resolve_success"));
    } catch {
      toast.error(t("admin_alerts.messages.resolve_failed"));
    }
  };

  const handleCloseOverlay = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("notification");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const alerts: Alert[] = alertsData?.alerts || alertsData?.data?.alerts || [];

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("admin_alerts.title")}</h1>
          <p className="text-[#142B6F] font-medium">{t("admin_alerts.subtitle")}</p>
        </div>
        <button
          onClick={handleScanAlerts}
          disabled={scanAlerts.isPending}
          className="px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50"
        >
          {scanAlerts.isPending ? t("admin_alerts.scanning") : t("admin_alerts.run_scan")}
        </button>
      </div>

      <div className="flex gap-2 border-b border-[#E1DEE5]/50">
        <button
          onClick={() => handleTabChange("alerts")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "alerts" ? "border-[#111111] text-[#111111]" : "border-transparent text-[#142B6F]"}`}
        >
          {t("admin_alerts.tabs.alerts")}
        </button>
        <button
          onClick={() => handleTabChange("notifications")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "notifications" ? "border-[#111111] text-[#111111]" : "border-transparent text-[#142B6F]"}`}
        >
          {t("admin_alerts.tabs.notifications")}
          {notificationsData?.unreadCount && notificationsData.unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {notificationsData.unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "alerts" ? (
        <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-hidden">
          {loadingAlerts ? (
            <LoadingList count={3} />
          ) : (
            alerts.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-4 border-b border-[#E1DEE5]/30">
                <div>
                  <p className="text-sm font-bold text-[#111111]">{item.message}</p>
                  <p className="text-xs text-[#142B6F]">
                    {item.type} • {item.severity}
                  </p>
                </div>
                <button
                  onClick={() => handleResolveAlert(item.id)}
                  disabled={item.is_resolved}
                  className="px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-30"
                >
                  {item.is_resolved ? t("admin_alerts.resolved") : t("admin_alerts.resolve")}
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loadingNotifications ? (
            <LoadingList count={5} />
          ) : (
            notificationsData?.notifications?.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left bg-white rounded-2xl border p-4 transition-all ${!n.is_read ? "border-l-4 border-l-blue-500 shadow-sm" : "border-[#E1DEE5]/60"}`}
              >
                <span className="text-xs font-bold text-blue-600 uppercase">{n.type}</span>
                <p className="text-sm font-medium text-[#111111] line-clamp-1">{n.message}</p>
                <p className="text-[10px] text-[#142B6F] mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      )}

      <NotificationOverlay
        notification={activeNotification}
        isOpen={!!activeNotification}
        onClose={handleCloseOverlay}
        refetch={refetchNotifications}
      />
    </div>
  );
}

export default function AdminAlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12">
          <LoadingList count={5} />
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
