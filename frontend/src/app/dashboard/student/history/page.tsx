"use client";

import { useEffect, useState } from "react";
import { HistorySummary } from "@/components/HistorySummary";
import { DetailedHistoryTable } from "@/components/DetailedHistoryTable";
import { Pagination } from "@/components/Pagination";
import { fetchApi } from "@/lib/api";

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
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [rentalsRes, configRes] = await Promise.all([
          fetchApi(`/rentals/mine?page=${page}&limit=${limit}`),
          fetchApi("/system-config"),
        ]);
        
        if (rentalsRes && Array.isArray(rentalsRes.rentals)) {
          setRentals(rentalsRes.rentals);
          if (rentalsRes.meta) {
            setTotalPages(rentalsRes.meta.totalPages || 1);
          }
        }
        
        if (configRes?.data?.config) {
          setConfig(configRes.data.config);
        }
      } catch (e) {
        console.error("History load error:", e);
        setError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  return (
    <div className="p-6 lg:p-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
          Borrowing History
        </h1>
        <p className="text-secondary font-medium">
          View your complete borrowing history and track your reading journey.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <HistorySummary rentals={rentals} config={config} loading={loading} />

      <div className="space-y-8">
        <DetailedHistoryTable rentals={rentals} config={config} loading={loading} />
        {totalPages > 1 && (
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
