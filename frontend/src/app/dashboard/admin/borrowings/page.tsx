"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { useRentals, useProcessReturn } from "@/lib/hooks/useQueries";

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
      toast.success("Return processed successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to process return"));
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Borrowings</h1>
          <p className="text-[#AE9E85] font-medium">Track active rentals, returns, and overdue items.</p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
            <input type="text" placeholder="Search borrowing" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] w-56" />
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl">
            <RefreshCcw size={15} />Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div></div>
        ) : (
          <>
            <div className="grid grid-cols-[1.6fr_2fr_1fr_1fr_1fr_0.8fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Student</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Book</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Loan Date</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Due Date</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Status</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Fine</span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase">Action</span>
            </div>
            {paginated.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#AE9E85]">No borrowings found</div>
            ) : (
              paginated.map((rental) => (
                <div key={rental.id} className="grid grid-cols-[1.6fr_2fr_1fr_1fr_1fr_0.8fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6]">
                  <div className="min-w-0"><p className="text-sm font-bold text-[#2B1A10] truncate">{rental.user?.name}</p><p className="text-xs text-[#AE9E85] truncate">{rental.user?.email}</p></div>
                  <span className="text-sm text-[#2B1A10] truncate">{rental.physical_book?.title}</span>
                  <span className="text-sm text-[#2B1A10]/70">{new Date(rental.loan_date).toLocaleDateString()}</span>
                  <span className="text-sm text-[#2B1A10]/70">{new Date(rental.due_date).toLocaleDateString()}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] text-[#2B1A10] w-fit">{rental.status}</span>
                  <span className="text-sm text-[#2B1A10]/70">{Number(rental.fine || 0).toFixed(2)}</span>
                  <button onClick={() => handleProcessReturn(rental.id)} disabled={processingReturnId === rental.id || rental.status === "RETURNED" || rental.status === "COMPLETED"} className="px-3 py-1.5 text-xs font-bold text-[#2B1A10] border border-[#C2B199] rounded-lg hover:bg-[#C2B199]/20 disabled:opacity-40">
                    {processingReturnId === rental.id ? "Working..." : "Return"}
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30"><ChevronLeft size={16} />Previous</button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#2B1A10] text-white" : "text-[#2B1A10]/60 hover:bg-[#F3EFE6]"}`}>{page}</button>
            ))}
          </div>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 disabled:opacity-30">Next<ChevronRight size={16} /></button>
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
          <div className="h-12 w-64 bg-[#E1D2BD]/30 rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-[#E1D2BD]/30 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div></div>
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
