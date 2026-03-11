"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMyPayments, useMyRentals, useMyDebtSummary, api } from "@/lib/hooks/useQueries";

type Payment = {
  id: string;
  amount: number;
  method: "CHAPA" | "CASH";
  status: "PENDING" | "SUCCESS" | "FAILED";
  paid_at: string;
  rental: {
    id: string;
    status: string;
    fine?: number | null;
    physical_book: { title: string };
  };
};

type RentalFine = {
  id: string;
  fine: number | null;
  physical_book: { title: string };
};

function PaymentsContent() {
  const searchParams = useSearchParams();
  const txRefFromQuery =
    searchParams.get("tx_ref") ||
    searchParams.get("trx_ref") ||
    searchParams.get("reference") ||
    searchParams.get("txRef");

  const [verifyingTx, setVerifyingTx] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = useMyPayments("limit=100");
  const { data: rentalsData } = useMyRentals("status=PENDING&limit=100");
  const { data: debtSummaryData } = useMyDebtSummary();
  const payments: Payment[] = (paymentsData?.payments || []) as unknown as Payment[];
  const pendingFines: RentalFine[] = ((rentalsData?.rentals || []) as unknown as RentalFine[]).filter(
    (r) => Number(r.fine || 0) > 0,
  );
  const debtSummary = debtSummaryData?.data;

  const loading = paymentsLoading;

  useEffect(() => {
    const txRef = txRefFromQuery;
    if (!txRef) return;

    const run = async () => {
      try {
        setVerifyingTx(txRef);
        setVerifyMessage(null);
        const verifyRes = await api.get<{ data: { payment: { status: string } } }>(
          `/payments/verify/${encodeURIComponent(txRef)}`,
        );
        await refetchPayments();
        const paymentStatus = verifyRes?.data?.payment?.status;
        if (paymentStatus === "SUCCESS") setVerifyMessage("Payment verified successfully.");
        else if (paymentStatus === "PENDING") setVerifyMessage("Payment is still pending confirmation.");
        else if (paymentStatus === "FAILED") setVerifyMessage("Payment failed. Please try again.");
        else setVerifyMessage("Payment status updated.");
      } catch (err) {
        setVerifyMessage(err instanceof Error ? err.message : "Payment verification failed.");
      } finally {
        setVerifyingTx(null);
      }
    };

    run();
  }, [txRefFromQuery, refetchPayments]);

  const payFine = async (rentalId: string) => {
    const result = await api.post<{ data: { chapaUrl: string } }>(`/payments/rental/${rentalId}/initiate`, {
      method: "CHAPA",
    });
    const url = result?.data?.chapaUrl;
    if (url) window.location.href = url;
  };

  const retryPayment = async (payment: Payment) => {
    const isBorrowPayment = payment.rental.status === "BORROWED" && Number(payment.rental.fine || 0) <= 0;
    const result = await api.post<{ data: { chapaUrl: string } }>(`/payments/rental/${payment.rental.id}/initiate`, {
      method: "CHAPA",
      context: isBorrowPayment ? "BORROW" : "FINE",
    });
    const url = result?.data?.chapaUrl;
    if (url) window.location.href = url;
  };

  const actionablePayments = payments.filter((p) => p.status === "PENDING" || p.status === "FAILED");

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Fine Payments</h1>
        <p className="text-secondary font-medium">Review pending fines and payment history.</p>
        {verifyingTx && <p className="text-sm text-secondary">Verifying payment {verifyingTx}...</p>}
        {verifyMessage && <p className="text-sm text-primary">{verifyMessage}</p>}
      </div>

      {debtSummary?.hasDebt ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <h2 className="text-lg font-serif font-bold text-[#7A4B00]">Outstanding Overdue Fines</h2>
          <p className="text-sm text-[#7A4B00]">
            Total due: <span className="font-bold">{Number(debtSummary.totalDebt || 0).toFixed(2)} ETB</span>. Borrow
            checkout will force settlement of these overdue fines.
          </p>
          <div className="space-y-1">
            {debtSummary.overdueFines.slice(0, 4).map((entry) => (
              <p key={entry.rental_id} className="text-xs text-[#7A4B00]">
                • {entry.book_title}: {Number(entry.amount || 0).toFixed(2)} ETB
              </p>
            ))}
            {debtSummary.overdueFines.length > 4 ? (
              <p className="text-xs text-[#7A4B00]">+{debtSummary.overdueFines.length - 4} more overdue fine(s)</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Pending Fines</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-secondary">Loading pending fines...</div>
          ) : pendingFines.length === 0 ? (
            <div className="text-sm text-secondary">No pending fines.</div>
          ) : (
            pendingFines.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-border/60 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-primary">{r.physical_book.title}</p>
                  <p className="text-xs text-secondary">Fine: {Number(r.fine || 0).toFixed(2)} ETB</p>
                </div>
                <button
                  onClick={() => payFine(r.id)}
                  className="px-4 py-2 rounded-xl bg-primary text-background text-sm font-bold"
                >
                  Pay Now
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Pending Payments</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-secondary">Loading pending payments...</div>
          ) : actionablePayments.length === 0 ? (
            <div className="text-sm text-secondary">No pending payments.</div>
          ) : (
            actionablePayments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-border/60 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-primary">{p.rental?.physical_book?.title || "Book"}</p>
                  <p className="text-xs text-secondary">
                    Amount: {Number(p.amount || 0).toFixed(2)} ETB - Status: {p.status}
                  </p>
                </div>
                <button
                  onClick={() => retryPayment(p)}
                  className="px-4 py-2 rounded-xl bg-primary text-background text-sm font-bold"
                >
                  Continue Payment
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
            <span className="text-[11px] font-bold text-secondary uppercase">Book</span>
            <span className="text-[11px] font-bold text-secondary uppercase">Amount</span>
            <span className="text-[11px] font-bold text-secondary uppercase">Method</span>
            <span className="text-[11px] font-bold text-secondary uppercase">Status</span>
            <span className="text-[11px] font-bold text-secondary uppercase">Date</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-secondary text-sm">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-secondary text-sm">No payments yet.</div>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-border/30"
              >
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

function PaymentsLoading() {
  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <div className="h-12 w-64 bg-[#E1D2BD]/30 rounded-lg animate-pulse" />
        <div className="h-5 w-96 bg-[#E1D2BD]/30 rounded-lg animate-pulse" />
      </div>
      <div className="py-16 text-center text-secondary text-sm">Loading payments...</div>
    </div>
  );
}

export default function StudentPaymentsPage() {
  return (
    <Suspense fallback={<PaymentsLoading />}>
      <PaymentsContent />
    </Suspense>
  );
}
