"use client";

import { useState } from "react";
import { useMyReservations, useCancelReservation } from "@/lib/hooks/useQueries";

type Reservation = {
  id: string;
  queue_position: number;
  status: "QUEUED" | "NOTIFIED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  reserved_at: string;
  expires_at?: string | null;
  book: { title: string; cover_image_url: string; author: { name: string } };
};

export default function StudentReservationsPage() {
  const { data: reservationsData, isLoading } = useMyReservations();
  const cancelReservation = useCancelReservation();

  const rows: Reservation[] = (reservationsData?.reservations || []) as unknown as Reservation[];

  const handleCancel = async (id: string) => {
    await cancelReservation.mutateAsync(id);
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">My Reservations</h1>
        <p className="text-secondary font-medium">Track your queue and reservation windows.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border/50 bg-[#FDFAF6]">
          <span className="text-[11px] font-bold text-secondary uppercase">Book</span>
          <span className="text-[11px] font-bold text-secondary uppercase">Queue</span>
          <span className="text-[11px] font-bold text-secondary uppercase">Status</span>
          <span className="text-[11px] font-bold text-secondary uppercase">Expires</span>
          <span className="text-[11px] font-bold text-secondary uppercase">Action</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-secondary text-sm">Loading reservations...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-secondary text-sm">No reservations found.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-border/30 last:border-0">
              <div><p className="text-sm font-bold text-primary">{r.book.title}</p><p className="text-xs text-secondary">{r.book.author?.name}</p></div>
              <span className="text-sm text-primary/80">#{r.queue_position}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary w-fit">{r.status}</span>
              <span className="text-sm text-primary/70">{r.expires_at ? new Date(r.expires_at).toLocaleString() : "-"}</span>
              <button disabled={!(["QUEUED", "NOTIFIED"] as string[]).includes(r.status)} onClick={() => handleCancel(r.id)} className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg disabled:opacity-40">
                {cancelReservation.variables === r.id ? "Cancelling..." : "Cancel"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
