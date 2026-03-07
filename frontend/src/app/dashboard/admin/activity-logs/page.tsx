"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  description: string;
  created_at: string;
  admin: { name: string; email: string };
};

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/admin/activity-logs?limit=200")
      .then((data) => setLogs(data?.logs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Admin Activity Logs</h1>
        <p className="text-[#AE9E85] font-medium">Audit trail of admin actions for accountability.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
          <span>Admin</span>
          <span>Action</span>
          <span>Description</span>
          <span>Entity</span>
          <span>Date</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">No activity logs</div>
        ) : (
          logs.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 last:border-0">
              <div>
                <p className="text-sm font-bold text-[#2B1A10]">{row.admin?.name || "Unknown"}</p>
                <p className="text-xs text-[#AE9E85]">{row.admin?.email || ""}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] text-[#2B1A10] w-fit">{row.action}</span>
              <span className="text-sm text-[#2B1A10]/80">{row.description}</span>
              <span className="text-sm text-[#2B1A10]/70">{row.entity_type}</span>
              <span className="text-sm text-[#2B1A10]/70">{new Date(row.created_at).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
