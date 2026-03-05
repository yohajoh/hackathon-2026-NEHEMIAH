"use client";

import { useEffect, useState } from "react";
import {
  Book,
  Users,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  BookMarked,
} from "lucide-react";

interface StatsData {
  users: { total: number };
  books: { total: number };
  rentals: {
    active: number;
    overdue: number;
    completed: number;
  };
  revenue: { thisMonth: number };
  // Additional stats for seasonal/overall
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would be an authenticated request
    fetch("http://localhost:5000/api/stats/overview")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setStats(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overview = stats || {
    users: { total: 0 },
    books: { total: 0 },
    rentals: { active: 0, overdue: 0, completed: 0 },
    revenue: { thisMonth: 0 },
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-serif font-bold text-primary">
          Dashboard
        </h1>
      </header>

      {/* System Alerts */}
      <section>
        <h2 className="text-xl font-bold text-primary mb-6">System Alerts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overdue */}
          <div className="bg-[#FFE5E5] p-8 rounded-[32px] flex flex-col items-center text-center">
            <span className="text-6xl font-bold text-primary mb-2">
              {overview.rentals.overdue}
            </span>
            <p className="text-primary/60 font-medium mb-6">Overdue Books</p>
            <button className="bg-[#A0937D] text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all w-full">
              Send Reminder
            </button>
          </div>

          {/* Pending Requests */}
          <div className="bg-[#FFF8E1] p-8 rounded-[32px] flex flex-col items-center text-center">
            <span className="text-6xl font-bold text-primary mb-2">
              {overview.rentals.pendingRequests}
            </span>
            <p className="text-primary/60 font-medium mb-6">Pending Requests</p>
            <button className="bg-[#A0937D] text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all w-full">
              Approve Request
            </button>
          </div>

          {/* Pending Returns */}
          <div className="bg-[#E8F5E9] p-8 rounded-[32px] flex flex-col items-center text-center">
            <span className="text-6xl font-bold text-primary mb-2">
              {overview.rentals.pendingReturns}
            </span>
            <p className="text-primary/60 font-medium mb-6">Pending returns</p>
            <button className="bg-[#A0937D] text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all w-full">
              Confirm Return
            </button>
          </div>
        </div>
      </section>

      {/* Seasonal Summary */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Seasonal Summary</h2>
          <select className="bg-white border border-[#E8E2D4] rounded-lg px-3 py-1.5 text-sm font-medium text-primary">
            <option>This Month</option>
            <option>Last Month</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Most Borrowed */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E2D4] flex gap-4 overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#FDF9F0] flex items-center justify-center text-primary">
              <BookMarked size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary/40 uppercase tracking-wider mb-1">
                Most Borrowed Book
              </p>
              <p className="text-sm font-bold text-primary truncate">
                {overview.topBook?.title || "No data"}
              </p>
              <p className="text-[10px] text-primary/50">
                {overview.topBook?.author?.name || ""}
              </p>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E2D4] flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FDF9F0] flex items-center justify-center text-primary">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary/40 uppercase tracking-wider mb-1">
                Total Revenue
              </p>
              <p className="text-xl font-bold text-primary">
                {overview.revenue.thisMonth} birr
              </p>
            </div>
          </div>

          {/* Top Reader */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E2D4] flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FDF9F0] flex items-center justify-center text-primary">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary/40 uppercase tracking-wider mb-1">
                Top Reader
              </p>
              <p className="text-sm font-bold text-primary">
                John doe (5 books)
              </p>
            </div>
          </div>

          {/* Borrowed Books */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E2D4] flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FDF9F0] flex items-center justify-center text-primary">
              <ArrowLeftRight size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-primary/40 uppercase tracking-wider mb-1">
                Borrowed Books
              </p>
              <p className="text-xl font-bold text-primary">23</p>
            </div>
          </div>
        </div>
      </section>

      {/* Overall Summary */}
      <section className="max-w-md">
        <h2 className="text-xl font-bold text-primary mb-6">Overall Summary</h2>
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D4] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Book className="text-primary/40" size={24} />
              <span className="font-bold text-primary">Total Books</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {overview.books.total}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D4] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="text-primary/40" size={24} />
              <span className="font-bold text-primary">Active Borrowers</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {overview.rentals.active}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D4] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="text-primary/40" size={24} />
              <span className="font-bold text-primary">Total Users</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {overview.users.total}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
