"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { API_BASE_URL, fetchApi } from "@/lib/api";

const REPORTS = [
  { key: "rentals", label: "Rentals" },
  { key: "overdue", label: "Overdue" },
  { key: "users", label: "Users" },
  { key: "inventory", label: "Inventory" },
  { key: "reservations", label: "Reservations" },
];

export default function AdminReportsPage() {
  const [active, setActive] = useState("rentals");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPreview = async (type: string) => {
    setLoading(true);
    setActive(type);
    try {
      const data = await fetchApi(`/admin/reports/export?type=${type}&format=json`);
      setRows(data?.data?.rows || []);
    } catch (error) {
      toast.error("Failed to load report data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]).slice(0, 6) : []), [rows]);

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Reports & Export</h1>
        <p className="text-[#AE9E85] font-medium">Generate CSV or preview JSON report data from the database.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {REPORTS.map((report) => (
          <button
            key={report.key}
            onClick={() => loadPreview(report.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${active === report.key ? "bg-[#2B1A10] text-white" : "bg-white border border-[#E1D2BD] text-[#2B1A10]"}`}
          >
            {report.label}
          </button>
        ))}
        <a
          href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=csv`}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-[#8B6B4A] text-white"
        >
          Download CSV
        </a>
        <a
          href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=excel`}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-[#6D5339] text-white"
        >
          Download Excel
        </a>
        <a
          href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=pdf`}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-[#2B1A10] text-white"
        >
          Download PDF
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Select a report to preview</div>
        ) : (
          <>
            <div className="grid gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>
              {headers.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {rows.slice(0, 20).map((row, idx) => (
              <div key={idx} className="grid gap-4 px-6 py-4 border-b border-[#E1D2BD]/30 text-sm text-[#2B1A10]/80" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>
                {headers.map((h) => (
                  <span key={h} className="truncate">{String(row[h] ?? "")}</span>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
