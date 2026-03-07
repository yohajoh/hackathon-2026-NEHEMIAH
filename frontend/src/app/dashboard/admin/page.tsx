"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Book,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Award,
  BookMarked,
  ChevronDown,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([fetchApi("/stats/overview"), fetchApi("/stats/users")])
      .then(([overviewData, usersData]) => {
        setStats(overviewData?.data || null);
        setUserStats(usersData?.data || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        setLoading(false);
      });
  }, []);

  const handleSendReminder = async () => {
    setSendingReminders(true);
    try {
      await fetchApi("/rentals/admin/send-reminders", { method: "POST" });
      await fetchApi("/stats/overview").then((data) => setStats(data?.data || null));
    } catch (err) {
      console.error("Failed to send reminders:", err);
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div>
          <p className="text-[#AE9E85] font-serif italic text-sm">
            Curating your scriptorium...
          </p>
        </div>
      </div>
    );
  }

  const overview = stats || {
    users: { total: 0 },
    books: { total: 0 },
    rentals: {
      active: 0,
      overdue: 0,
      pendingRequests: 0,
      pendingReturns: 0,
      completed: 0,
    },
    revenue: { thisMonth: 0 },
    topBook: null,
  };

  return (
    <div className="p-6 lg:p-12 space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">
          Dashboard
        </h1>
        <p className="text-[#AE9E85] font-medium">
          Here&apos;s a live overview of the library system.
        </p>
      </header>

      {/* System Alerts */}
      <section>
        <h2 className="text-xl font-serif font-bold text-[#2B1A10] mb-6">
          System Alerts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Overdue */}
          <div className="bg-[#FDE2E2] p-6 rounded-2xl flex flex-col items-center text-center">
            <span className="text-4xl font-black text-[#2B1A10] mb-1 tracking-tighter">
              {overview.rentals.overdue}
            </span>
            <p className="text-[#2B1A10]/60 font-medium text-sm mb-5">
              Overdue Books
            </p>
            <button
              onClick={handleSendReminder}
              disabled={sendingReminders}
              className="bg-[#8B6B4A] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#6D5339] transition-all w-full text-sm disabled:opacity-60"
            >
              {sendingReminders ? "Sending..." : "Send Reminder"}
            </button>
          </div>

          {/* Pending Requests */}
          <div className="bg-[#FEF3C7] p-6 rounded-2xl flex flex-col items-center text-center">
            <span className="text-4xl font-black text-[#2B1A10] mb-1 tracking-tighter">
              {overview.rentals.pendingRequests}
            </span>
            <p className="text-[#2B1A10]/60 font-medium text-sm mb-5">
              Pending Requests
            </p>
            <button
              onClick={() => router.push("/dashboard/admin/borrowings?status=PENDING")}
              className="bg-[#8B6B4A] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#6D5339] transition-all w-full text-sm"
            >
              Approve Request
            </button>
          </div>

          {/* Pending Returns */}
          <div className="bg-[#D1FAE5] p-6 rounded-2xl flex flex-col items-center text-center">
            <span className="text-4xl font-black text-[#2B1A10] mb-1 tracking-tighter">
              {overview.rentals.pendingReturns}
            </span>
            <p className="text-[#2B1A10]/60 font-medium text-sm mb-5">
              Pending returns
            </p>
            <button
              onClick={() => router.push("/dashboard/admin/borrowings?status=RETURNED")}
              className="bg-[#8B6B4A] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#6D5339] transition-all w-full text-sm"
            >
              Confirm Return
            </button>
          </div>
        </div>
        <div className="mt-4 bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#AE9E85] uppercase tracking-wider">
              Active Reservations
            </p>
            <p className="text-2xl font-black text-[#2B1A10]">
              {overview.rentals.reservations || 0}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/admin/reservations")}
            className="bg-[#2B1A10] text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            Manage Queue
          </button>
        </div>
      </section>

      {/* Seasonal Summary */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold text-[#2B1A10]">
            Seasonal Summary
          </h2>
          <div className="relative group">
            <select className="appearance-none bg-white border border-[#E1D2BD] rounded-xl px-3 py-2 pr-8 text-sm font-medium text-[#2B1A10] focus:outline-none focus:border-[#8B6B4A] transition-all cursor-pointer">
              <option>This Month</option>
              <option>Last Month</option>
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B6B4A] pointer-events-none"
              size={14}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Most Borrowed */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-start gap-3 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#FDF8F0] flex items-center justify-center text-[#8B6B4A] shrink-0">
              <BookMarked size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#AE9E85] uppercase tracking-wider mb-1">
                Most Borrowed Book
              </p>
              <p className="text-sm font-bold text-[#2B1A10] truncate leading-tight">
                {overview.topBook?.title || "No data"}
              </p>
              <p className="text-[11px] italic text-[#AE9E85]">
                {overview.topBook?.author?.name || ""}
              </p>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-start gap-3 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#FDF8F0] flex items-center justify-center text-[#8B6B4A] shrink-0">
              <TrendingUp size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#AE9E85] uppercase tracking-wider mb-1">
                Total Revenue
              </p>
              <p className="text-lg font-bold text-[#2B1A10]">
                {overview.revenue.thisMonth}{" "}
                <span className="text-xs text-[#AE9E85]">birr</span>
              </p>
            </div>
          </div>

          {/* Top Reader */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-start gap-3 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#FDF8F0] flex items-center justify-center text-[#8B6B4A] shrink-0">
              <Award size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#AE9E85] uppercase tracking-wider mb-1">
                Top Reader
              </p>
              <p className="text-sm font-bold text-[#2B1A10]">
                {userStats?.topBorrowers?.[0]?.user?.name || "No data"}{" "}
                <span className="text-xs font-normal text-[#AE9E85]">
                  ({userStats?.topBorrowers?.[0]?.rentalCount || 0} books)
                </span>
              </p>
            </div>
          </div>

          {/* Borrowed Books */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-start gap-3 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#FDF8F0] flex items-center justify-center text-[#8B6B4A] shrink-0">
              <ArrowLeftRight size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#AE9E85] uppercase tracking-wider mb-1">
                Borrowed Books
              </p>
              <p className="text-lg font-bold text-[#2B1A10]">
                {overview.rentals.active +
                  overview.rentals.overdue +
                  overview.rentals.completed}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Overall Summary */}
      <section className="max-w-md">
        <h2 className="text-xl font-serif font-bold text-[#2B1A10] mb-6">
          Overall Summary
        </h2>
        <div className="space-y-3">
          {/* Total Books */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-center justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-[#FDF8F0] p-2.5 rounded-lg">
                <Book className="text-[#AE9E85]" size={20} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-[#2B1A10]">
                Total Books
              </span>
            </div>
            <span className="text-xl font-bold text-[#2B1A10]">
              {overview.books.total}
            </span>
          </div>

          {/* Active Borrowers */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-center justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-[#FDF8F0] p-2.5 rounded-lg">
                <Users className="text-[#AE9E85]" size={20} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-[#2B1A10]">
                Active Borrowers
              </span>
            </div>
            <span className="text-xl font-bold text-[#2B1A10]">
              {overview.rentals.active}
            </span>
          </div>

          {/* Total Users */}
          <div className="bg-white p-4 rounded-2xl border border-[#E1D2BD]/50 flex items-center justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-[#FDF8F0] p-2.5 rounded-lg">
                <Users className="text-[#AE9E85]" size={20} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-[#2B1A10]">
                Total Users
              </span>
            </div>
            <span className="text-xl font-bold text-[#2B1A10]">
              {overview.users.total}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
