"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { CurrentlyBorrowed } from "@/components/CurrentlyBorrowed";
import { AmountOwed } from "@/components/AmountOwed";
import { BorrowingHistoryTable } from "@/components/BorrowingHistoryTable";
import { fetchApi, fetchCurrentUser } from "@/lib/api";

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
  payment?: { amount: number; status: string } | null;
};

export type SystemConfig = {
  id: number;
  max_loan_days: number;
  daily_fine: string | number;
  max_books_per_user: number;
  enable_notifications: boolean;
};

export default function DashboardPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch user data
        const userRes = await fetchCurrentUser();
        setUser(userRes ?? null);

        // Fetch rentals and config in parallel
        const [rentalsRes, configRes] = await Promise.all([
          fetchApi("/rentals/mine?limit=20"),
          fetchApi("/system-config"),
        ]);
        
        // Set rentals data
        if (rentalsRes && Array.isArray(rentalsRes.rentals)) {
          setRentals(rentalsRes.rentals);
        }
        
        // Set config data
        if (configRes?.data?.config) {
          setConfig(configRes.data.config);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const borrowed = rentals.filter((r) => r.status === "BORROWED");
  const currentBook = borrowed[0] ?? null;
  const returnedOrCompleted = rentals.filter(
    (r) => r.status === "RETURNED" || r.status === "COMPLETED"
  );
  
  // Calculate pending fines (status = PENDING means returned but fine not paid)
  const pendingFine = rentals
    .filter((r) => r.status === "PENDING" && r.fine != null)
    .reduce((sum, r) => sum + Number(r.fine), 0);
  
  // Calculate estimated overdue fines for currently borrowed books
  const overdueEstimated = borrowed
    .filter((r) => r.isOverdue && r.daysOverdue != null)
    .reduce((sum, r) => {
      const days = r.daysOverdue ?? 0;
      const rate = config?.daily_fine ? Number(config.daily_fine) : 0;
      return sum + days * rate;
    }, 0);
  
  const totalOwed = pendingFine + overdueEstimated;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <div className="grow flex flex-col lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 p-6 lg:p-12 space-y-12">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
              Welcome back, {loading ? "..." : user?.name ?? "Guest"}
            </h1>
            <p className="text-secondary font-medium">
              Here&apos;s what&apos;s happening with your books.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2 space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-primary">
                  Currently Borrowed Book
                </h2>
                <CurrentlyBorrowed
                  rental={currentBook}
                  dailyFine={config?.daily_fine ? Number(config.daily_fine) : undefined}
                  loading={loading}
                />
              </div>
            </div>
            <div className="xl:col-span-1">
              <AmountOwed
                rental={currentBook}
                totalOwed={totalOwed}
                config={config}
                loading={loading}
              />
            </div>
          </div>

          <BorrowingHistoryTable
            rentals={returnedOrCompleted.slice(0, 5)}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}
