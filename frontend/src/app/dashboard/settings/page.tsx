"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { SecuritySettings } from "@/components/SecuritySettings";
import { fetchCurrentUser } from "@/lib/api";

export type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  role: string;
  is_confirmed: boolean;
  created_at: string;
};

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await fetchCurrentUser();
        setUser(userData as UserData);
      } catch (e) {
        console.error("Failed to load user:", e);
        setError(e instanceof Error ? e.message : "Failed to load user data");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleUserUpdate = (updatedUser: UserData) => {
    setUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <div className="grow flex flex-col lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 p-6 lg:p-12 space-y-12">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
              Account Settings
            </h1>
            <p className="text-secondary font-medium">
              Manage your personal information, notification preferences, and
              account security.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-16 max-w-4xl">
            <ProfileSettings user={user} loading={loading} onUpdate={handleUserUpdate} />

            <div className="h-px bg-border/40 w-full" />

            <SecuritySettings user={user} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  );
}
