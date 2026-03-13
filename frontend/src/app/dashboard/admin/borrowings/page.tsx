"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { useRentals, useProcessReturn } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Rental = {
  id: string;
  status: string;
  loan_date: string;
  due_date: string;
  return_date?: string | null;
  fine?: number | null;
  user: { name: string; email: string; student_id?: string | null };
  physical_book: { title: string };
  isOverdue?: boolean;
  daysOverdue?: number;
};

const ITEMS_PER_PAGE = 10;

function BorrowingsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useLanguage();
  
  const statusFilter = searchParams.get("status") || "";
  const queryParams = new URLSearchParams();
  queryParams.set("limit", "200");
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data: rentalsData, isLoading, refetch } = useRentals(queryParams.toString());
  const processReturn = useProcessReturn();
  const processingReturnId = processReturn.isPending ? processReturn.variables : undefined;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const rentals: Rental[] = (rentalsData?.rentals || []) as unknown as Rental[];

  const filtered = rentals.filter(
    (r) => !search.trim() || 
    r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.physical_book?.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.status?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleProcessReturn = async (id: string) => {
    try {
      await processReturn.mutateAsync(id);
      toast.success(t("admin_borrowings.messages.return_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_borrowings.messages.return_failed") || "Failed to process return"));
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("admin_borrowings.title")}</h1>
          <p className="text-[#142B6F] font-medium">{t("admin_borrowings.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
            <input type="text" placeholder={t("admin_borrowings.search_placeholder")} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1DEE5] rounded-xl text-[#111111] placeholder:text-[#E1DEE5] w-56" />
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl">
            <RefreshCcw size={15} />{t("common.refresh") || "Refresh"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-hidden">
        {isLoading ? (
          <div className="py-8 px-6 space-y-3">
            <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
            <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
            <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.6fr_2fr_1fr_1fr_1fr_0.8fr_1fr] gap-4 px-6 py-3 border-b border-[#E1DEE5]/50 bg-[#FFFFFF]">
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.student")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.book")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.loan_date")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.due_date")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.status")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.fine")}</span>
              <span className="text-[11px] font-bold text-[#142B6F] uppercase">{t("admin_borrowings.table.action")}</span>
            </div>
            {paginated.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#142B6F]">{t("admin_borrowings.table.no_borrowings")}</div>
            ) : (
              paginated.map((rental) => (
                <div key={rental.id} className="grid grid-cols-[1.6fr_2fr_1fr_1fr_1fr_0.8fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1DEE5]/30 hover:bg-[#FFFFFF]">
                  <div className="min-w-0"><p className="text-sm font-bold text-[#111111] truncate">{rental.user?.name}</p><p className="text-xs text-[#142B6F] truncate">{rental.user?.email}</p></div>
                  <span className="text-sm text-[#111111] truncate">{rental.physical_book?.title}</span>
                  <span className="text-sm text-[#111111]/70">{new Date(rental.loan_date).toLocaleDateString()}</span>
                  <span className="text-sm text-[#111111]/70">{new Date(rental.due_date).toLocaleDateString()}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#E1DEE5] text-[#111111] w-fit">{rental.status}</span>
                  <span className="text-sm text-[#111111]/70">{Number(rental.fine || 0).toFixed(2)}</span>
                  <button onClick={() => handleProcessReturn(rental.id)} disabled={processingReturnId === rental.id || rental.status === "RETURNED" || rental.status === "COMPLETED"} className="px-3 py-1.5 text-xs font-bold text-[#111111] border border-[#E1DEE5] rounded-lg hover:bg-[#E1DEE5]/20 disabled:opacity-40">
                    {processingReturnId === rental.id ? t("admin_borrowings.actions.processing") : t("admin_borrowings.actions.return")}
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"><ChevronLeft size={16} />{t("common.previous")}</button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#142B6F] text-white" : "text-[#111111]/60 hover:bg-[#E1DEE5]"}`}>{page}</button>
            ))}
          </div>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30">{t("common.next")}<ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

function BorrowingsLoading() {
  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="h-12 w-64 bg-[#E1DEE5]/30 rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-[#E1DEE5]/30 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-hidden">
        <div className="py-8 px-6 space-y-3">
          <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
          <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
          <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AdminBorrowingsPage() {
  return (
    <Suspense fallback={<BorrowingsLoading />}>
      <BorrowingsContent />
    </Suspense>
  );
}
