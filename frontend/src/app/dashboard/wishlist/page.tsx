"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WishlistSummary } from "@/components/WishlistSummary";
import { WishlistGrid } from "@/components/WishlistGrid";
import { Pagination } from "@/components/Pagination";

export default function WishlistPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <div className="grow flex flex-col lg:flex-row">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-12 space-y-16">
          {/* Summary Section */}
          <WishlistSummary />

          {/* Grid Section */}
          <div className="space-y-10">
            <WishlistGrid />
            <Pagination />
          </div>
        </main>
      </div>
    </div>
  );
}
