"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <div className="grow flex flex-col lg:flex-row">
        <DashboardSidebar />
        <main className="flex-1 p-6 lg:p-12 space-y-12">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
              Admin Dashboard
            </h1>
            <p className="text-secondary font-medium">
              Manage users, books, and system settings.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-secondary">
            Admin management tools will appear here.
          </div>
        </main>
      </div>
    </div>
  );
}
