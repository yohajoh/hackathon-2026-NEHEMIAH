"use client";

import { useEffect, useState } from "react";
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
  const [overviewStats, setOverviewStats] = useState<{
    reservationCount: number;
    unreadNotifications: number;
    onTimeRate: number;
    dueSoon: number;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<
    Array<{ id: string; title: string; author?: { name: string }; available: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const userRes = await fetchCurrentUser();
        setUser(userRes ?? null);

        const [rentalsRes, configRes, overviewRes, recommendationRes] = await Promise.all([
          fetchApi("/rentals/mine?limit=20"),
          fetchApi("/system-config"),
          fetchApi("/student/overview"),
          fetchApi("/student/recommendations?limit=6"),
        ]);

        if (rentalsRes && Array.isArray(rentalsRes.rentals)) {
          setRentals(rentalsRes.rentals);
        }

        if (configRes?.data?.config) {
          setConfig(configRes.data.config);
        }
        if (overviewRes?.data?.stats) {
          setOverviewStats({
            reservationCount: overviewRes.data.stats.reservationCount || 0,
            unreadNotifications: overviewRes.data.stats.unreadNotifications || 0,
            onTimeRate: overviewRes.data.stats.onTimeRate || 0,
            dueSoon: overviewRes.data.stats.dueSoon || 0,
          });
        }
        if (recommendationRes?.data?.physical) {
          setRecommendations(recommendationRes.data.physical);
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
  const returnedOrCompleted = rentals.filter((r) => r.status === "RETURNED" || r.status === "COMPLETED");

  const pendingFine = rentals
    .filter((r) => r.status === "PENDING" && r.fine != null)
    .reduce((sum, r) => sum + Number(r.fine), 0);

  const overdueEstimated = borrowed
    .filter((r) => r.isOverdue && r.daysOverdue != null)
    .reduce((sum, r) => {
      const days = r.daysOverdue ?? 0;
      const rate = config?.daily_fine ? Number(config.daily_fine) : 0;
      return sum + days * rate;
    }, 0);

  const totalOwed = pendingFine + overdueEstimated;

  return (
    <div className="p-6 lg:p-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
          Welcome back, {loading ? "..." : (user?.name ?? "Guest")}
        </h1>
        <p className="text-secondary font-medium">Here&apos;s what&apos;s happening with your books.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-8">
          <div className="space-y-6">
            <h2 className="text-xl font-serif font-bold text-primary">Currently Borrowed Book</h2>
            <CurrentlyBorrowed
              rental={currentBook}
              dailyFine={config?.daily_fine ? Number(config.daily_fine) : undefined}
              loading={loading}
            />
          </div>
        </div>
        <div className="xl:col-span-1">
          <AmountOwed rental={currentBook} totalOwed={totalOwed} config={config} loading={loading} />
        </div>
      </div>

      <BorrowingHistoryTable rentals={returnedOrCompleted.slice(0, 5)} loading={loading} />

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Your Reading Snapshot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">Due Soon</p>
            <p className="text-2xl font-black text-primary">{overviewStats?.dueSoon ?? 0}</p>
          </div>
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">On-Time Rate</p>
            <p className="text-2xl font-black text-primary">{overviewStats?.onTimeRate ?? 0}%</p>
          </div>
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">Reservations</p>
            <p className="text-2xl font-black text-primary">{overviewStats?.reservationCount ?? 0}</p>
          </div>
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">Unread Alerts</p>
            <p className="text-2xl font-black text-primary">{overviewStats?.unreadNotifications ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Recommended For You</h2>
        {recommendations.length === 0 ? (
          <div className="text-sm text-secondary">No recommendations yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recommendations.map((book) => (
              <div key={book.id} className="bg-white border border-border/50 rounded-2xl p-4">
                <p className="text-sm font-bold text-primary line-clamp-1">{book.title}</p>
                <p className="text-xs text-secondary">{book.author?.name ?? "Author"}</p>
                <p className="text-xs mt-2 font-semibold text-primary/80">
                  {book.available > 0 ? `${book.available} copies available` : "Currently unavailable"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
