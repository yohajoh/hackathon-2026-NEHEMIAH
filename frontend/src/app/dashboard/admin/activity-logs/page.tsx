/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useActivityLogs } from "@/lib/hooks/useQueries";
import { Clock, User, Shield, Terminal } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin: { name: string; email: string };
};

export default function AdminActivityLogsPage() {
  const { data: logsData, isLoading } = useActivityLogs("limit=200");
  const logs: LogRow[] = (logsData as unknown as { logs?: LogRow[] })?.logs || [];
  const { t } = useLanguage();

  const columns: ColumnDef<LogRow, unknown>[] = [
    {
      id: "admin",
      header: (
        <span className="flex items-center gap-2">
          <User size={14} /> {t("admin_activity_logs.table.admin")}
        </span>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#111111] truncate">
            {row.original.admin?.name || t("admin_activity_logs.system")}
          </p>
          <p className="text-[11px] text-[#142B6F] truncate font-medium">
            {row.original.admin?.email || "internal@system"}
          </p>
        </div>
      ),
    },
    {
      id: "action",
      header: (
        <span className="flex items-center gap-2">
          <Terminal size={14} /> {t("admin_activity_logs.table.action")}
        </span>
      ),
      cell: ({ row }) => (
        <span
          className={`text-[10px] font-black px-2.5 py-1 rounded-md tracking-tighter uppercase ${
            row.original.action === "DELETE"
              ? "bg-red-50 text-red-600"
              : row.original.action === "CREATE"
                ? "bg-green-50 text-green-600"
                : row.original.action === "UPDATE"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-[#E1DEE5] text-[#111111]"
          }`}
        >
          {row.original.action}
        </span>
      ),
    },
    {
      id: "description",
      header: t("admin_activity_logs.table.description"),
      cell: ({ row }) => (
        <div className="max-w-md">
          <span className="text-sm text-[#111111]/90 leading-relaxed block">{row.original.description}</span>
          <span className="text-[10px] text-[#142B6F] font-bold uppercase mt-0.5 block">
            {row.original.entity_type}
          </span>
        </div>
      ),
    },
    {
      id: "timestamp",
      header: (
        <span className="flex items-center gap-2">
          <Clock size={14} /> {t("admin_activity_logs.table.timestamp")}
        </span>
      ),
      cell: ({ row }) => (
        <div className="text-xs font-medium text-[#142B6F]">
          <p className="text-[#111111]/70">{new Date(row.original.created_at).toLocaleDateString()}</p>
          <p className="text-[10px]">{new Date(row.original.created_at).toLocaleTimeString()}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111] flex flex-wrap items-center gap-3">
            <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-[#142B6F]" />
            {t("admin_activity_logs.title")}
          </h1>
          <p className="text-[#142B6F] font-medium mt-2">{t("admin_activity_logs.subtitle")}</p>
        </div>
        <div className="px-4 py-2 bg-[#FFFFFF] border border-[#E1DEE5]/50 rounded-xl text-xs font-bold text-[#142B6F] uppercase tracking-wider">
          {t("admin_activity_logs.retention")}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E1DEE5]/50 shadow-xl shadow-[#111111]/5 overflow-visible">
        <TanStackTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          emptyText={t("admin_activity_logs.no_logs")}
          skeletonRows={4}
        />
      </div>
    </div>
  );
}
