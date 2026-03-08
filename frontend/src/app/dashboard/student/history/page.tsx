"use client";

import { useState } from "react";
import { useMyRentals, useSystemConfig } from "@/lib/hooks/useQueries";
import { HistorySummary } from "@/components/HistorySummary";
import { DetailedHistoryTable } from "@/components/DetailedHistoryTable";
import { Pagination } from "@/components/Pagination";

export type RentalItem = {
  id: string;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  status: "BORROWED" | "PENDING" | "RETURNED" | "COMPLETED";
  fine: number | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  daysUntilDue?: number | null;
  physical_book: { id: string; title: string; cover_image_url: string; pages: number };
  payment?: { id: string; amount: number; status: string; method: string } | null;
};

export type SystemConfig = {
  id: number;
  max_loan_days: number;
  daily_fine: string | number;
  max_books_per_user: number;
};

export default function BorrowingHistoryPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: rentalsData, isLoading } = useMyRentals(`page=${page}&limit=${limit}`);
  const { data: configData } = useSystemConfig();

  const rentals: RentalItem[] = (rentalsData?.rentals || []) as unknown as RentalItem[];
  const config: SystemConfig | null = configData?.data?.config as unknown as SystemConfig | null;

  const totalPages = Math.max(1, Math.ceil(rentals.length / limit));

  return (
    <div className="p-6 lg:p-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Borrowing History</h1>
        <p className="text-secondary font-medium">View your complete borrowing history and track your reading journey.</p>
      </div>

      <HistorySummary rentals={rentals} config={config} loading={isLoading} />

      <div className="space-y-8">
        <DetailedHistoryTable rentals={rentals} config={config} loading={isLoading} />
        {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}
