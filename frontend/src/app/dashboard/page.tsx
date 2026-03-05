"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { CurrentlyBorrowed } from "@/components/CurrentlyBorrowed";
import { AmountOwed } from "@/components/AmountOwed";
import { BorrowingHistoryTable } from "@/components/BorrowingHistoryTable";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <div className="grow flex flex-col lg:flex-row">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-12 space-y-12">
          {/* Welcome Header */}
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
              Welcome back, Anonymous
            </h1>
            <p className="text-secondary font-medium">
              Here&apos;s what&apos;s happening with your books.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* Left: Borrowing Status */}
            <div className="xl:col-span-2 space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-primary">
                  Currently Borrowed Book
                </h2>
                <CurrentlyBorrowed />
              </div>
            </div>

            {/* Right: Financial Summary */}
            <div className="xl:col-span-1">
              <AmountOwed />
            </div>
          </div>

          {/* Bottom: Borrowing History */}
          <BorrowingHistoryTable />
        </main>
      </div>
    </div>
  );
}
