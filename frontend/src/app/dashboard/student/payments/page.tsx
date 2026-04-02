"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMyPayments, useMyRentals, useMyDebtSummary, api } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

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
  const { t } = useLanguage();
  const [txRefFromQuery, setTxRefFromQuery] = useState<string | null>(null);
  const [verifyingTx, setVerifyingTx] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const hasVerifiedRef = useRef<string | null>(null); // Track if we've already verified this tx_ref

  // Get tx_ref from URL only once on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const txRef =
      searchParams.get("tx_ref") ||
      searchParams.get("trx_ref") ||
      searchParams.get("reference") ||
      searchParams.get("txRef");

    setTxRefFromQuery(txRef);
  }, []); // Empty dependency array - only run once

  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = useMyPayments("limit=100");

  const { data: rentalsData } = useMyRentals("status=PENDING&limit=100");
  const { data: debtSummaryData } = useMyDebtSummary();

  const payments: Payment[] = (paymentsData?.payments || []) as unknown as Payment[];
  const pendingFines: RentalFine[] = ((rentalsData?.rentals || []) as unknown as RentalFine[]).filter(
    (r) => Number(r.fine || 0) > 0,
  );
  const debtSummary = debtSummaryData?.data;

  const loading = paymentsLoading;

  // Handle payment verification - wrapped in useCallback to prevent recreation
  const verifyPayment = useCallback(
    async (txRef: string) => {
      // Skip if already verified this transaction
      if (hasVerifiedRef.current === txRef) return;

      try {
        setVerifyingTx(txRef);
        setVerifyMessage(null);
        hasVerifiedRef.current = txRef;

        const verifyRes = await api.get<{ data: { payment: { status: string } } }>(
          `/payments/verify/${encodeURIComponent(txRef)}`,
        );

        // Refetch payments after verification
        await refetchPayments();

        const paymentStatus = verifyRes?.data?.payment?.status;
        if (paymentStatus === "SUCCESS") setVerifyMessage(t("student_payments.success_verify"));
        else if (paymentStatus === "PENDING") setVerifyMessage(t("student_payments.pending_verify"));
        else if (paymentStatus === "FAILED") setVerifyMessage(t("student_payments.failed_verify"));
        else setVerifyMessage(t("student_payments.status_updated"));
      } catch (err) {
        setVerifyMessage(err instanceof Error ? err.message : t("common.error_occurred"));
      } finally {
        setVerifyingTx(null);
      }
    },
    [refetchPayments, t],
  );

  // Effect for verification - depends on txRefFromQuery and verifyPayment
  useEffect(() => {
    if (txRefFromQuery && !hasVerifiedRef.current) {
      verifyPayment(txRefFromQuery);
    }
  }, [txRefFromQuery, verifyPayment]);

  const payFine = async (rentalId: string) => {
    try {
      const result = await api.post<{ data: { chapaUrl: string } }>(`/payments/rental/${rentalId}/initiate`, {
        method: "CHAPA",
      });
      const url = result?.data?.chapaUrl;
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Failed to initiate payment:", error);
      setVerifyMessage(t("common.error_occurred"));
    }
  };

  const retryPayment = async (payment: Payment) => {
    try {
      const isBorrowPayment = payment.rental.status === "BORROWED" && Number(payment.rental.fine || 0) <= 0;
      const result = await api.post<{ data: { chapaUrl: string } }>(`/payments/rental/${payment.rental.id}/initiate`, {
        method: "CHAPA",
        context: isBorrowPayment ? "BORROW" : "FINE",
      });
      const url = result?.data?.chapaUrl;
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Failed to retry payment:", error);
      setVerifyMessage(t("common.error_occurred"));
    }
  };

  const actionablePayments = payments.filter((p) => p.status === "PENDING" || p.status === "FAILED");

  const historyColumns: ColumnDef<Payment, unknown>[] = [
    {
      id: "book",
      header: t("admin_reservations.table.book"),
      cell: ({ row }) => (
        <span className="text-sm text-primary">{row.original.rental?.physical_book?.title || "Book"}</span>
      ),
    },
    {
      id: "amount",
      header: t("dashboard.stats.revenue"),
      cell: ({ row }) => <span className="text-sm text-primary/80">{Number(row.original.amount).toFixed(2)} ETB</span>,
    },
    {
      id: "method",
      header: t("admin_reservations.table.method") || "Method",
      cell: ({ row }) => <span className="text-sm text-primary/80">{row.original.method}</span>,
    },
    {
      id: "status",
      header: t("admin_reservations.table.status"),
      cell: ({ row }) => (
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary w-fit block">
          {row.original.status}
        </span>
      ),
    },
    {
      id: "paid_at",
      header: t("admin_reservations.table.reserved"),
      cell: ({ row }) => (
        <span className="text-sm text-primary/70">{new Date(row.original.paid_at).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">{t("student_payments.title")}</h1>
        <p className="text-secondary font-medium">{t("student_payments.subtitle")}</p>
        {verifyingTx && (
          <p className="text-sm text-secondary">{t("student_payments.verifying", { ref: verifyingTx })}</p>
        )}
        {verifyMessage && <p className="text-sm text-primary">{verifyMessage}</p>}
      </div>

      {debtSummary?.hasDebt ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <h2 className="text-lg font-serif font-bold text-[#142B6F]">{t("student_payments.outstanding_title")}</h2>
          <p className="text-sm text-[#142B6F]">
            {t("student_payments.outstanding_desc", { amount: Number(debtSummary.totalDebt || 0).toFixed(2) })}
          </p>
          <div className="space-y-1">
            {debtSummary.overdueFines?.slice(0, 4).map((entry: any) => (
              <p key={entry.rental_id} className="text-xs text-[#142B6F]">
                • {entry.book_title}: {Number(entry.amount || 0).toFixed(2)} ETB
              </p>
            ))}
            {debtSummary.overdueFines?.length > 4 ? (
              <p className="text-xs text-[#142B6F]">
                {t("student_payments.more_overdue", { count: debtSummary.overdueFines.length - 4 })}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">{t("student_payments.pending_fines")}</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-secondary">{t("student_payments.loading_fines")}</div>
          ) : pendingFines.length === 0 ? (
            <div className="text-sm text-secondary">{t("student_payments.no_fines")}</div>
          ) : (
            pendingFines.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-border/60 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-primary">{r.physical_book.title}</p>
                  <p className="text-xs text-secondary">
                    {t("admin_reservations.table.debt")}: {Number(r.fine || 0).toFixed(2)} ETB
                  </p>
                </div>
                <button
                  onClick={() => payFine(r.id)}
                  className="px-4 py-2 rounded-xl bg-primary text-background text-sm font-bold"
                >
                  {t("student_payments.pay_now")}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">{t("student_payments.pending_payments")}</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-secondary">{t("student_payments.loading_payments")}</div>
          ) : actionablePayments.length === 0 ? (
            <div className="text-sm text-secondary">{t("student_payments.no_pending_payments")}</div>
          ) : (
            actionablePayments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-border/60 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-primary">{p.rental?.physical_book?.title || "Book"}</p>
                  <p className="text-xs text-secondary">
                    {t("dashboard.stats.revenue")}: {Number(p.amount || 0).toFixed(2)} ETB -{" "}
                    {t("admin_reservations.table.status")}: {p.status}
                  </p>
                </div>
                <button
                  onClick={() => retryPayment(p)}
                  className="px-4 py-2 rounded-xl bg-primary text-background text-sm font-bold"
                >
                  {t("student_payments.continue_payment")}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">{t("student_payments.history")}</h2>
        <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
          <TanStackTable
            data={payments}
            columns={historyColumns}
            isLoading={loading}
            emptyText={t("student_payments.no_history")}
            skeletonRows={5}
          />
        </div>
      </section>
    </div>
  );
}

export default function StudentPaymentsPage() {
  return <PaymentsContent />;
}
