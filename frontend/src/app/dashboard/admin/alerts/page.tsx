"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

type Alert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  book: { title: string; available: number; copies: number };
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/admin/inventory-alerts?limit=200");
      setAlerts(data?.alerts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resolveAlert = async (id: string) => {
    await fetchApi(`/admin/inventory-alerts/${id}/resolve`, { method: "PATCH" });
    await loadData();
  };

  const scanAlerts = async () => {
    await fetchApi("/admin/inventory-alerts/scan", { method: "POST" });
    await loadData();
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Inventory Alerts</h1>
          <p className="text-[#AE9E85] font-medium">Low stock and extended overdue alert monitoring.</p>
        </div>
        <button onClick={scanAlerts} className="px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl">
          Run Scan
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_2.5fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
          <span>Type</span>
          <span>Severity</span>
          <span>Message</span>
          <span>Book</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">No alerts</div>
        ) : (
          alerts.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_1fr_2.5fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 last:border-0">
              <span className="text-sm text-[#2B1A10]">{item.type}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] text-[#2B1A10] w-fit">{item.severity}</span>
              <p className="text-sm text-[#2B1A10]/80 line-clamp-2">{item.message}</p>
              <span className="text-sm text-[#2B1A10]/70">{item.book?.title || "-"}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${item.is_resolved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {item.is_resolved ? "Resolved" : "Open"}
              </span>
              <button
                onClick={() => resolveAlert(item.id)}
                disabled={item.is_resolved}
                className="px-3 py-1.5 text-xs font-bold text-[#2B1A10] border border-[#C2B199] rounded-lg disabled:opacity-40"
              >
                Resolve
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
