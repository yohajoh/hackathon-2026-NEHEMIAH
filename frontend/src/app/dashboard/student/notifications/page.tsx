"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

type NotificationItem = {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function StudentNotificationsPage() {
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/notifications/mine?limit=100");
      setRows(res?.notifications || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await fetchApi("/notifications/mine/read-all", { method: "PATCH" });
    await load();
  };

  const markOne = async (id: string) => {
    await fetchApi(`/notifications/${id}/read`, { method: "PATCH" });
    await load();
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Notifications</h1>
          <p className="text-secondary font-medium">Stay updated with due reminders and library updates.</p>
        </div>
        <button onClick={markAll} className="px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-xl">
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-secondary text-sm">Loading notifications...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-secondary text-sm">No notifications found.</div>
        ) : (
          rows.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-border/60 p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">{n.message}</p>
                <p className="text-xs text-secondary">{new Date(n.created_at).toLocaleString()} • {n.type}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markOne(n.id)}
                  className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
