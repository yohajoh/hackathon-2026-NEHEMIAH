"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

type OverdueRental = {
  id: string;
  due_date: string;
  daysOverdue: number;
  estimatedFine: number;
  user: { name: string; email: string };
  physical_book: { title: string };
};

export default function AdminOverduePage() {
  const [rows, setRows] = useState<OverdueRental[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/rentals/admin/overdue?limit=200");
      setRows(data?.rentals || []);
    } finally {
      setLoading(false);
    }
  };

  const sendReminders = async () => {
    await fetchApi("/rentals/admin/send-reminders", { method: "POST" });
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Overdue Dashboard</h1>
          <p className="text-[#AE9E85] font-medium">Track overdue records, days overdue, and fine exposure.</p>
        </div>
        <button onClick={sendReminders} className="px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl">
          Send Reminders
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
          <span>Student</span>
          <span>Book</span>
          <span>Due Date</span>
          <span>Days Overdue</span>
          <span>Estimated Fine</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">No overdue rentals</div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 last:border-0">
              <div>
                <p className="text-sm font-bold text-[#2B1A10]">{item.user.name}</p>
                <p className="text-xs text-[#AE9E85]">{item.user.email}</p>
              </div>
              <span className="text-sm text-[#2B1A10]">{item.physical_book.title}</span>
              <span className="text-sm text-[#2B1A10]/70">{new Date(item.due_date).toLocaleDateString()}</span>
              <span className="text-sm font-bold text-red-700">{item.daysOverdue}</span>
              <span className="text-sm text-[#2B1A10]/70">{Number(item.estimatedFine).toFixed(2)} ETB</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
