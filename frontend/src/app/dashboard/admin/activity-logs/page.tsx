"use client";

import { useActivityLogs } from "@/lib/hooks/useQueries";
import { Clock, User, Shield, Terminal } from "lucide-react";

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

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10] flex items-center gap-4">
            <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-[#AE9E85]" />
            Admin Activity Logs
          </h1>
          <p className="text-[#AE9E85] font-medium mt-2">Comprehensive audit trail of system-wide administrative actions.</p>
        </div>
        <div className="px-4 py-2 bg-[#FDFAF6] border border-[#E1D2BD]/50 rounded-xl text-xs font-bold text-[#AE9E85] uppercase tracking-wider">
          Retention: Last 200 Actions
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E1D2BD]/50 shadow-xl shadow-[#2B1A10]/5 overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_3fr_1fr] gap-4 px-8 py-5 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-widest">
          <span className="flex items-center gap-2"><User size={14} /> Admin</span>
          <span className="flex items-center gap-2"><Terminal size={14} /> Action</span>
          <span className="flex items-center gap-2">Description</span>
          <span className="flex items-center gap-2"><Clock size={14} /> Timestamp</span>
        </div>

        <div className="divide-y divide-[#E1D2BD]/30">
          {isLoading ? (
            <div className="py-24 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#AE9E85]/20 border-t-[#AE9E85] rounded-full mx-auto mb-4" />
              <p className="text-[#AE9E85] font-medium italic">Fetching audit data...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-24 text-center text-[#AE9E85] font-medium italic">No activity logs recorded yet.</div>
          ) : (
            logs.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.5fr_1fr_3fr_1fr] gap-4 items-center px-8 py-5 hover:bg-[#FDFAF6]/50 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2B1A10] truncate">{row.admin?.name || "System"}</p>
                  <p className="text-[11px] text-[#AE9E85] truncate font-medium">{row.admin?.email || "internal@system"}</p>
                </div>
                
                <div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-md tracking-tighter uppercase ${
                    row.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                    row.action === 'CREATE' ? 'bg-green-50 text-green-600' :
                    row.action === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                    'bg-[#F3EFE6] text-[#2B1A10]'
                  }`}>
                    {row.action}
                  </span>
                </div>

                <div className="max-w-md">
                  <span className="text-sm text-[#2B1A10]/90 leading-relaxed block">{row.description}</span>
                  <span className="text-[10px] text-[#AE9E85] font-bold uppercase mt-0.5 block">{row.entity_type}</span>
                </div>

                <div className="text-xs font-medium text-[#AE9E85]">
                  <p className="text-[#2B1A10]/70">{new Date(row.created_at).toLocaleDateString()}</p>
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
