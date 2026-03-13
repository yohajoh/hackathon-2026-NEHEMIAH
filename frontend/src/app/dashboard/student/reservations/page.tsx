"use client";

import { useMyReservations, useCancelReservation } from "@/lib/hooks/useQueries";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Reservation = {
  id: string;
  queue_position: number;
  status: "QUEUED" | "NOTIFIED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  reserved_at: string;
  expires_at?: string | null;
  book: { title: string; cover_image_url: string; author: { name: string } };
};

export default function StudentReservationsPage() {
  const { t } = useLanguage();
  const { data: reservationsData, isLoading } = useMyReservations();
  const cancelReservation = useCancelReservation();

  const rows: Reservation[] = (reservationsData?.reservations || []) as unknown as Reservation[];

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation.mutateAsync(id);
      toast.success(t("student_reservations.success_cancel"));
    } catch {
      toast.error(t("student_reservations.error_cancel"));
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">{t("student_reservations.title")}</h1>
        <p className="text-secondary font-medium">{t("student_reservations.subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border/50 bg-[#FFFFFF]">
          <span className="text-[11px] font-bold text-secondary uppercase">{t("admin_reservations.table.book")}</span>
          <span className="text-[11px] font-bold text-secondary uppercase">{t("admin_reservations.table.queue")}</span>
          <span className="text-[11px] font-bold text-secondary uppercase">{t("admin_reservations.table.status")}</span>
          <span className="text-[11px] font-bold text-secondary uppercase">{t("admin_reservations.table.expires")}</span>
          <span className="text-[11px] font-bold text-secondary uppercase">{t("admin_reservations.table.action")}</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-secondary text-sm">{t("admin_reservations.high_demand.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-secondary text-sm">{t("student_reservations.no_reservations")}</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-border/30 last:border-0"
            >
              <div>
                <p className="text-sm font-bold text-primary">{r.book.title}</p>
                <p className="text-xs text-secondary">{r.book.author?.name}</p>
              </div>
              <span className="text-sm text-primary/80">#{r.queue_position}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary w-fit">{r.status}</span>
              <span className="text-sm text-primary/70">
                {r.expires_at ? new Date(r.expires_at).toLocaleString() : "-"}
              </span>
              <button
                disabled={!(["QUEUED", "NOTIFIED"] as string[]).includes(r.status)}
                onClick={() => handleCancel(r.id)}
                className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg disabled:opacity-40"
              >
                {cancelReservation.isPending && cancelReservation.variables === r.id ? t("student_reservations.cancelling") : t("student_reservations.cancel")}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
