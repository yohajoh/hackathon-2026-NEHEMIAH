"use client";

import { useState, useMemo } from "react";
import { fetchCurrentUser } from "@/lib/api";
import { useMyRentals, useSystemConfig, useStudentOverview, useRecommendations, usePopularity, Rental, SystemConfig } from "@/lib/hooks/useQueries";
import { CurrentlyBorrowed } from "@/components/CurrentlyBorrowed";
import { AmountOwed } from "@/components/AmountOwed";
import { BorrowingHistoryTable } from "@/components/BorrowingHistoryTable";

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

export default function DashboardPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [error] = useState<string | null>(null);

  const { data: rentalsData, isLoading: rentalsLoading } = useMyRentals();
  const { data: configData } = useSystemConfig();
  const { data: overviewData } = useStudentOverview();
  const { data: recommendationsData } = useRecommendations();
  const { data: popularityData } = usePopularity();

  const rentals: Rental[] = (rentalsData?.rentals || []) as unknown as Rental[];
  const config: SystemConfig | null = configData?.data?.config as unknown as SystemConfig | null;

  const overviewStats = useMemo(() => {
    const data = overviewData?.data as {
      stats?: { reservationCount?: number; unreadNotifications?: number; onTimeRate?: number; dueSoon?: number };
      topCategories?: Array<{ name: string; count: number }>;
    } | undefined;
    return {
      reservationCount: data?.stats?.reservationCount || 0,
      unreadNotifications: data?.stats?.unreadNotifications || 0,
      onTimeRate: data?.stats?.onTimeRate || 0,
      dueSoon: data?.stats?.dueSoon || 0,
      topCategories: data?.topCategories || [],
    };
  }, [overviewData]);

  const recommendations = useMemo(() => {
    const data = recommendationsData?.data as { physical?: Array<{ id: string; title: string; author?: { name: string }; available: number }> };
    return data?.physical || [];
  }, [recommendationsData]);

  const popularity = useMemo(() => {
    const data = popularityData?.data as {
      trending?: Array<{ book: { id: string; title: string; author?: { name: string } }; rentalCount: number }>;
      topRated?: Array<{ book: { id: string; title: string; author?: { name: string } }; avgRating: number }>;
    };
    return {
      trending: data?.trending || [],
      topRated: data?.topRated || [],
    };
  }, [popularityData]);

  const loading = rentalsLoading;

  const borrowed = rentals.filter((r) => r.status === "BORROWED");
  const currentBook = borrowed[0] ?? null;
  const returnedOrCompleted = rentals.filter((r) => r.status === "RETURNED" || r.status === "COMPLETED");

  const pendingFine = rentals.filter((r) => r.status === "PENDING" && r.fine != null).reduce((sum, r) => sum + Number(r.fine), 0);
  const overdueEstimated = borrowed.filter((r) => r.isOverdue && r.daysOverdue != null).reduce((sum, r) => {
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
            <CurrentlyBorrowed rental={currentBook} dailyFine={config?.daily_fine ? Number(config.daily_fine) : undefined} loading={loading} />
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
            <p className="text-2xl font-black text-primary">{overviewStats.dueSoon}</p>
          </div>
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">On-Time Rate</p>
            <p className="text-2xl font-black text-primary">{overviewStats.onTimeRate}%</p>
          </div>
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">Reservations</p>
            <p className="text-2xl font-black text-primary">{overviewStats.reservationCount}</p>
          </div>
          <div className="bg-white border border-border/50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-secondary">Unread Alerts</p>
            <p className="text-2xl font-black text-primary">{overviewStats.unreadNotifications}</p>
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
                <p className="text-xs mt-2 font-semibold text-primary/80">{book.available > 0 ? `${book.available} copies available` : "Currently unavailable"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Favorite Categories</h2>
        {overviewStats.topCategories.length === 0 ? (
          <div className="text-sm text-secondary">No category insights yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {overviewStats.topCategories.map((cat) => (
              <span key={cat.name} className="px-3 py-1.5 rounded-full bg-white border border-border text-sm text-primary">{cat.name} ({cat.count})</span>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-primary">Trending Books</h2>
          <div className="space-y-2">
            {popularity.trending.length === 0 ? (
              <div className="text-sm text-secondary">No trending data yet.</div>
            ) : (
              popularity.trending.map((item) => (
                <div key={item.book.id} className="bg-white border border-border/50 rounded-xl p-3 flex items-center justify-between">
                  <div><p className="text-sm font-bold text-primary">{item.book.title}</p><p className="text-xs text-secondary">{item.book.author?.name ?? "Author"}</p></div>
                  <span className="text-xs font-bold text-primary">{item.rentalCount} rentals</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-primary">Top Rated Books</h2>
          <div className="space-y-2">
            {popularity.topRated.length === 0 ? (
              <div className="text-sm text-secondary">No rating data yet.</div>
            ) : (
              popularity.topRated.map((item) => (
                <div key={item.book.id} className="bg-white border border-border/50 rounded-xl p-3 flex items-center justify-between">
                  <div><p className="text-sm font-bold text-primary">{item.book.title}</p><p className="text-xs text-secondary">{item.book.author?.name ?? "Author"}</p></div>
                  <span className="text-xs font-bold text-primary">{item.avgRating.toFixed(1)} ★</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
