"use client";

import { useActivityLogs } from "@/lib/hooks/useQueries";
import { Clock, User, Shield, Terminal } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

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

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111] flex items-center gap-4">
            <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-[#142B6F]" />
            {t("admin_activity_logs.title")}
          </h1>
          <p className="text-[#142B6F] font-medium mt-2">{t("admin_activity_logs.subtitle")}</p>
        </div>
        <div className="px-4 py-2 bg-[#FFFFFF] border border-[#E1DEE5]/50 rounded-xl text-xs font-bold text-[#142B6F] uppercase tracking-wider">
          {t("admin_activity_logs.retention")}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E1DEE5]/50 shadow-xl shadow-[#111111]/5 overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_3fr_1fr] gap-4 px-8 py-5 border-b border-[#E1DEE5]/50 bg-[#FFFFFF] text-[11px] font-bold text-[#142B6F] uppercase tracking-widest">
          <span className="flex items-center gap-2"><User size={14} /> {t("admin_activity_logs.table.admin")}</span>
          <span className="flex items-center gap-2"><Terminal size={14} /> {t("admin_activity_logs.table.action")}</span>
          <span className="flex items-center gap-2">{t("admin_activity_logs.table.description")}</span>
          <span className="flex items-center gap-2"><Clock size={14} /> {t("admin_activity_logs.table.timestamp")}</span>
        </div>

        <div className="divide-y divide-[#E1DEE5]/30">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.5fr_1fr_3fr_1fr] gap-4 items-center px-2 py-3">
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-20 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                  <div className="h-4 w-24 rounded-lg bg-[#E1DEE5]/70 animate-pulse" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-24 text-center text-[#142B6F] font-medium italic">{t("admin_activity_logs.no_logs")}</div>
          ) : (
            logs.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.5fr_1fr_3fr_1fr] gap-4 items-center px-8 py-5 hover:bg-[#FFFFFF]/50 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111111] truncate">{row.admin?.name || t("admin_activity_logs.system")}</p>
                  <p className="text-[11px] text-[#142B6F] truncate font-medium">{row.admin?.email || "internal@system"}</p>
                </div>
                
                <div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-md tracking-tighter uppercase ${
                    row.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                    row.action === 'CREATE' ? 'bg-green-50 text-green-600' :
                    row.action === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                    'bg-[#E1DEE5] text-[#111111]'
                  }`}>
                    {row.action}
                  </span>
                </div>

                <div className="max-w-md">
                  <span className="text-sm text-[#111111]/90 leading-relaxed block">{row.description}</span>
                  <span className="text-[10px] text-[#142B6F] font-bold uppercase mt-0.5 block">{row.entity_type}</span>
                </div>

                <div className="text-xs font-medium text-[#142B6F]">
                  <p className="text-[#111111]/70">{new Date(row.created_at).toLocaleDateString()}</p>
                  <p className="text-[10px]">{new Date(row.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

    </div>
  );
}
