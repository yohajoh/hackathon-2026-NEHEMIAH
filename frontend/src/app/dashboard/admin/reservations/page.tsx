"use client";

import { useState } from "react";
import { MoreHorizontal, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useReservations,
  useExpireReservations,
  useMoveReservationToTop,
  useIssueReservation,
  useReservationHighDemand,
  type HighDemandReservationBook,
} from "@/lib/hooks/useQueries";

type Reservation = {
  id: string;
  status: string;
  queue_position: number;
  reserved_at: string;
  notified_at?: string | null;
  fulfilled_at?: string | null;
  expires_at?: string | null;
  user_debt_total?: number;
  user: { name: string; email: string; student_id?: string | null };
  book: { id: string; title: string; available: number; copies?: number };
};

export default function AdminReservationsPage() {
  const [openMenuReservationId, setOpenMenuReservationId] = useState<string | null>(null);
  const [issueModalReservation, setIssueModalReservation] = useState<Reservation | null>(null);
  const [issueCopyCode, setIssueCopyCode] = useState("");
  const { data: reservationsData, isLoading } = useReservations();
  const { data: highDemandData, isLoading: highDemandLoading } = useReservationHighDemand("limit=6&min_queue=3");
  const expireReservations = useExpireReservations();
  const moveToTop = useMoveReservationToTop();
  const issueReservation = useIssueReservation();

  const reservations: Reservation[] = (reservationsData?.reservations || []) as unknown as Reservation[];
  const highDemand = (highDemandData?.data?.books || []) as HighDemandReservationBook[];

  const handleExpire = async (notifyUsers: boolean) => {
    try {
      const result = await expireReservations.mutateAsync({ notifyUsers });
      const expiredCount = Number(result?.data?.expiredCount ?? 0);
      if (expiredCount === 0) {
        toast.info("No expired reservation windows found");
        return;
      }
      toast.success(
        notifyUsers
          ? `Expired ${expiredCount} reservation window(s) with notifications`
          : `Expired ${expiredCount} reservation window(s) in silent mode`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to expire reservations");
    }
  };

  const handleMoveToTop = async (id: string) => {
    try {
      await moveToTop.mutateAsync(id);
      toast.success("Reservation moved to top of queue");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move reservation");
    }
  };

  const handleOpenIssueModal = (item: Reservation) => {
    setIssueModalReservation(item);
    setIssueCopyCode("");
  };

  const handleConfirmIssue = async () => {
    if (!issueModalReservation) return;
    if (!issueCopyCode.trim()) {
      toast.error("Copy code is required");
      return;
    }
    try {
      await issueReservation.mutateAsync({ id: issueModalReservation.id, copy_code: issueCopyCode.trim() });
      toast.success("Reservation issued and converted to rental");
      setIssueModalReservation(null);
      setIssueCopyCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to issue reservation");
    }
  };

  const handleRefresh = () => {
    window.location.reload();
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
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E1D2BD] rounded-xl text-sm font-bold text-[#2B1A10]"
          >
            <RefreshCcw size={15} /> Refresh
          </button>
          <button
            onClick={() => void handleExpire(false)}
            disabled={expireReservations.isPending}
            className="px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50"
          >
            {expireReservations.isPending ? "Sweeping..." : "Run Expiry Sweep (Silent)"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-visible">
        <div className="px-6 py-4 border-b border-[#E1D2BD]/50 bg-[#FFFAF3]">
          <h2 className="text-sm font-bold text-[#2B1A10] uppercase tracking-wide">Books Under High Demand</h2>
          {highDemandLoading ? (
            <p className="text-xs text-[#AE9E85] mt-2">Loading demand insights...</p>
          ) : highDemand.length === 0 ? (
            <p className="text-xs text-[#AE9E85] mt-2">No high-demand pressure detected.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {highDemand.map((item) => (
                <div key={item.book.id} className="rounded-xl border border-[#EADCC8] bg-white p-3">
                  <p className="text-sm font-bold text-[#2B1A10] truncate">{item.book.title}</p>
                  <p className="text-xs text-[#AE9E85] mt-1">
                    Queue: {item.queueCount} • Copies: {item.book.copies} • Available: {item.book.available}
                  </p>
                  <p className="text-xs text-[#8B6B4A] mt-1">Pressure ratio: {item.pressureRatio}</p>
                  {item.needsInventoryAction ? (
                    <p className="text-[11px] font-bold text-red-700 mt-1">
                      Inventory action recommended (10+ queue, &lt;=2 copies)
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-[2fr_2fr_0.7fr_0.9fr_1fr_1fr_1fr_1.6fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase">
          <span>Student</span>
          <span>Book</span>
          <span>Queue</span>
          <span>Status</span>
          <span>Debt</span>
          <span>Reserved</span>
          <span>Expires</span>
          <span className="text-right">Action</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">No reservations found</div>
        ) : (
          reservations.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[2fr_2fr_0.7fr_0.9fr_1fr_1fr_1fr_1.6fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 last:border-0"
            >
              <div>
                <p className="text-sm font-bold text-[#2B1A10] truncate">{item.user.name}</p>
                <p className="text-xs text-[#AE9E85] truncate">{item.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-[#2B1A10] truncate">{item.book.title}</p>
              </div>
              <span className="text-sm text-[#2B1A10]/70">#{item.queue_position}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] text-[#2B1A10] w-fit">
                {item.status}
              </span>
              <span
                className={`text-sm ${Number(item.user_debt_total || 0) > 0 ? "text-red-700 font-bold" : "text-[#2B1A10]/70"}`}
              >
                {Number(item.user_debt_total || 0) > 0 ? `${Number(item.user_debt_total).toFixed(2)} ETB` : "Clear"}
              </span>
              <span className="text-sm text-[#2B1A10]/70">{new Date(item.reserved_at).toLocaleDateString()}</span>
              <span className="text-sm text-[#2B1A10]/70">
                {item.expires_at ? new Date(item.expires_at).toLocaleString() : "-"}
              </span>
              <div className="relative flex justify-end" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  aria-label={`Open actions for reservation ${item.id}`}
                  onClick={() => setOpenMenuReservationId((current) => (current === item.id ? null : item.id))}
                  className="h-9 w-9 rounded-full border border-[#E1D2BD] bg-[#FFFDF9] text-[#8B6B4A] flex items-center justify-center"
                >
                  <MoreHorizontal size={16} />
                </button>

                {openMenuReservationId === item.id ? (
                  <div className="absolute right-10 top-0 z-2147483647 min-w-52 overflow-hidden rounded-xl border border-[#E6D7C4] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                    <button
                      type="button"
                      disabled={item.status !== "QUEUED" || moveToTop.isPending}
                      onClick={() => {
                        setOpenMenuReservationId(null);
                        void handleMoveToTop(item.id);
                      }}
                      className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#2B1A10] hover:bg-[#F8F2E9] disabled:opacity-40"
                    >
                      Move to Top
                    </button>
                    <button
                      type="button"
                      disabled={
                        issueReservation.isPending ||
                        !["QUEUED", "NOTIFIED"].includes(item.status) ||
                        (item.status === "QUEUED" && Number(item.queue_position || 0) !== 1) ||
                        Number(item.user_debt_total || 0) > 0
                      }
                      onClick={() => {
                        setOpenMenuReservationId(null);
                        handleOpenIssueModal(item);
                      }}
                      className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#2B1A10] hover:bg-[#F8F2E9] disabled:opacity-40"
                    >
                      Issue Book
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {issueModalReservation ? (
        <div
          className="fixed inset-0 z-2147483647 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!issueReservation.isPending) {
              setIssueModalReservation(null);
              setIssueCopyCode("");
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E1D2BD] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">Issue Reserved Book</h3>
            <p className="mt-1 text-sm text-[#AE9E85]">{issueModalReservation.book.title}</p>

            <div className="mt-4">
              <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Copy Code</label>
              <input
                type="text"
                value={issueCopyCode}
                onChange={(e) => setIssueCopyCode(e.target.value)}
                placeholder="BC-XXXXXXXX-0001"
                className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={issueReservation.isPending}
                onClick={() => {
                  setIssueModalReservation(null);
                  setIssueCopyCode("");
                }}
                className="px-4 py-2.5 rounded-xl border border-[#D9C8B3] text-sm font-bold text-[#6C5236] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={issueReservation.isPending || !issueCopyCode.trim()}
                onClick={() => void handleConfirmIssue()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2B1A10] disabled:opacity-40"
              >
                {issueReservation.isPending ? "Issuing..." : "Issue Book"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
