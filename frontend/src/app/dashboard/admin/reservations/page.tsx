"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Reservation = {
  id: string;
  status: string;
  queue_position: number;
  reserved_at: string;
  notified_at?: string | null;
  expires_at?: string | null;
  user: { name: string; email: string; student_id?: string | null };
  book: { title: string; available: number };
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiring, setExpiring] = useState(false);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/reservations?limit=200");
      setReservations(data?.reservations || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const expireReservations = async () => {
    setExpiring(true);
    try {
      await fetchApi("/reservations/admin/expire", { method: "POST" });
      await loadReservations();
    } finally {
      setExpiring(false);
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Reservations</h1>
          <p className="text-[#AE9E85] font-medium">Queue management and reservation windows.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadReservations}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E1D2BD] rounded-xl text-sm font-bold text-[#2B1A10]"
          >
            <RefreshCcw size={15} /> Refresh
          </button>
          <button
            onClick={expireReservations}
            disabled={expiring}
            className="px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50"
          >
            {expiring ? "Expiring..." : "Expire Pending"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_0.8fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
          <span>Student</span>
          <span>Book</span>
          <span>Queue</span>
          <span>Status</span>
          <span>Reserved</span>
          <span>Expires</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">No reservations found</div>
        ) : (
          reservations.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[2fr_2fr_0.8fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 last:border-0"
            >
              <div>
                <p className="text-sm font-bold text-[#2B1A10] truncate">{item.user.name}</p>
                <p className="text-xs text-[#AE9E85] truncate">{item.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-[#2B1A10] truncate">{item.book.title}</p>
              </div>
              <span className="text-sm text-[#2B1A10]/70">#{item.queue_position}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] text-[#2B1A10] w-fit">{item.status}</span>
              <span className="text-sm text-[#2B1A10]/70">{new Date(item.reserved_at).toLocaleDateString()}</span>
              <span className="text-sm text-[#2B1A10]/70">{item.expires_at ? new Date(item.expires_at).toLocaleString() : "-"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
