"use client";

import React from "react";
import { useOverdueRentals, useOverdueRanking, useSendReminders } from "@/lib/hooks/useQueries";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";

type OverdueRental = {
  id: string;
  due_date: string;
  daysOverdue: number;
  estimatedFine: number;
  user: { name: string; email: string };
  physical_book: { title: string };
};

type OverdueRank = {
  user: { id: string; name: string; email: string };
  overdueCount: number;
  totalDaysOverdue: number;
  totalEstimatedFine: number;
};

export default function AdminOverduePage() {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const { data: overdueData, isLoading: overdueLoading } = useOverdueRentals();
  const { data: rankingData } = useOverdueRanking();
  const sendReminders = useSendReminders();
  const { t } = useLanguage();

  const rows: OverdueRental[] = (overdueData?.rentals || []) as unknown as OverdueRental[];
  const ranking: OverdueRank[] = ((rankingData as unknown as { ranking?: OverdueRank[] })?.ranking || []) as OverdueRank[];

  const maxDays = Math.max(1, ...ranking.map((r) => r.totalDaysOverdue));

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSendReminders = async () => {
    try {
      await sendReminders.mutateAsync({ rentalIds: Array.from(selectedIds) });
      toast.success(t("admin_overdue.messages.reminders_success"));
      setSelectedIds(new Set());
    } catch {
      toast.error(t("admin_overdue.messages.reminders_failed"));
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("admin_overdue.title")}</h1>
          <p className="text-[#142B6F] font-medium">{t("admin_overdue.subtitle")}</p>
        </div>
        <button 
          onClick={handleSendReminders} 
          disabled={sendReminders.isPending || selectedIds.size === 0} 
          className="px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-opacity"
        >
          {sendReminders.isPending 
            ? t("admin_overdue.sending") 
            : t("admin_overdue.send_reminder", { count: selectedIds.size })}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#111111]">{t("admin_overdue.ranking_title")}</h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-[#142B6F]">{t("admin_overdue.no_ranking")}</p>
        ) : (
          ranking.map((item, idx) => (
            <div key={item.user.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#111111]">#{idx + 1} {item.user.name}</span>
                <span className="text-[#142B6F]">{item.totalDaysOverdue} {t("admin_overdue.days")} • {item.totalEstimatedFine.toFixed(2)} ETB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E1DEE5] overflow-hidden">
                <div className="h-full bg-[#142B6F]" style={{ width: `${(item.totalDaysOverdue / maxDays) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-hidden">
        <div className="grid grid-cols-[0.4fr_2fr_2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1DEE5]/50 bg-[#FFFFFF] text-[11px] font-bold text-[#142B6F] uppercase">
          <span className="flex justify-center">
            <input
              type="checkbox"
              checked={rows.length > 0 && selectedIds.size === rows.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-[#E1DEE5] text-[#111111] focus:ring-[#111111]"
            />
          </span>
          <span>{t("admin_overdue.table.student")}</span>
          <span>{t("admin_overdue.table.book")}</span>
          <span>{t("admin_overdue.table.due_date")}</span>
          <span>{t("admin_overdue.table.days_overdue")}</span>
          <span>{t("admin_overdue.table.estimated_fine")}</span>
        </div>

        {overdueLoading ? (
          <div className="py-16 text-center text-[#142B6F] text-sm">{t("common.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[#142B6F] text-sm">{t("admin_overdue.table.no_overdue")}</div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="grid grid-cols-[0.4fr_2fr_2fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1DEE5]/30 last:border-0 hover:bg-[#FFFFFF] transition-colors">
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => handleToggleSelect(item.id)}
                  className="w-4 h-4 rounded border-[#E1DEE5] text-[#111111] focus:ring-[#111111]"
                />
              </div>
              <div><p className="text-sm font-bold text-[#111111]">{item.user.name}</p><p className="text-xs text-[#142B6F]">{item.user.email}</p></div>
              <span className="text-sm text-[#111111] truncate">{item.physical_book.title}</span>
              <span className="text-sm text-[#111111]/70">{new Date(item.due_date).toLocaleDateString()}</span>
              <span className="text-sm font-bold text-red-700">{item.daysOverdue}</span>
              <span className="text-sm text-[#111111]/70">{Number(item.estimatedFine).toFixed(2)} ETB</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
