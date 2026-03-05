"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { SecuritySettings } from "@/components/SecuritySettings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <div className="grow flex flex-col lg:flex-row">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-12 space-y-12">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
              Account Settings
            </h1>
            <p className="text-secondary font-medium">
              Manage your personal information, notification preferences, and
              account security.
            </p>
          </div>

          <div className="space-y-16 max-w-4xl">
            {/* Profile Section */}
            <ProfileSettings />

            {/* Divider */}
            <div className="h-px bg-border/40 w-full" />

            {/* Security Section */}
            <SecuritySettings />
          </div>
        </main>
      </div>
    </div>
  );
}
