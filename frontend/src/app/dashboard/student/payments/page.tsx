"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

type Payment = {
  id: string;
  amount: number;
  method: "CHAPA" | "CASH";
  status: "PENDING" | "SUCCESS" | "FAILED";
  paid_at: string;
  rental: {
    id: string;
    status: string;
    physical_book: { title: string };
  };
};

type RentalFine = {
  id: string;
  fine: number | null;
  physical_book: { title: string };
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingFines, setPendingFines] = useState<RentalFine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [paymentsRes, rentalsRes] = await Promise.all([
        fetchApi("/payments/mine?limit=100"),
        fetchApi("/rentals/mine?status=PENDING&limit=100"),
      ]);
      setPayments(paymentsRes?.payments || []);
      setPendingFines((rentalsRes?.rentals || []).filter((r: RentalFine) => Number(r.fine || 0) > 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const payFine = async (rentalId: string) => {
    const result = await fetchApi(`/payments/rental/${rentalId}/initiate`, {
      method: "POST",
      body: JSON.stringify({ method: "CHAPA" }),
    });

    const url = result?.data?.chapaUrl || result?.chapaUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Fine Payments</h1>
        <p className="text-secondary font-medium">Review pending fines and payment history.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Pending Fines</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-secondary">Loading pending fines...</div>
          ) : pendingFines.length === 0 ? (
            <div className="text-sm text-secondary">No pending fines.</div>
          ) : (
            pendingFines.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-border/60 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-primary">{r.physical_book.title}</p>
                  <p className="text-xs text-secondary">Fine: {Number(r.fine || 0).toFixed(2)} ETB</p>
                </div>
                <button onClick={() => payFine(r.id)} className="px-4 py-2 rounded-xl bg-primary text-background text-sm font-bold">
                  Pay Now
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Payment History</h2>
        <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border/50 bg-[#FDFAF6]">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Book</span>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Amount</span>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Method</span>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Status</span>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Date</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-secondary text-sm">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-secondary text-sm">No payments yet.</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-border/30 last:border-0">
                <span className="text-sm text-primary">{p.rental?.physical_book?.title || "Book"}</span>
                <span className="text-sm text-primary/80">{Number(p.amount).toFixed(2)} ETB</span>
                <span className="text-sm text-primary/80">{p.method}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary w-fit">{p.status}</span>
                <span className="text-sm text-primary/70">{new Date(p.paid_at).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
