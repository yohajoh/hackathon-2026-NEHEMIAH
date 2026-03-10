"use client";

import { useCurrentUser } from "@/lib/hooks/useQueries";
import { ProfileSettings } from "@/components/ProfileSettings";
import { SecuritySettings } from "@/components/SecuritySettings";

export type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  year: string | null;
  department: string | null;
  student_id: string | null;
  role: string;
};

export default function SettingsPage() {
  const { data: userData, isLoading, error } = useCurrentUser();
  const user = userData?.data?.user as UserData | undefined;

  const handleUserUpdate = (updatedUser: UserData) => {
    void updatedUser;
    // The cache will be automatically invalidated by the mutation
  };

  return (
    <div className="p-6 lg:p-12 space-y-12">
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
          {error instanceof Error ? error.message : "Failed to load user data"}
        </div>
      )}

      <div className="space-y-16 max-w-4xl">
        <ProfileSettings user={user || null} loading={isLoading} onUpdate={handleUserUpdate} />

        <div className="h-px bg-border/40 w-full" />

        <SecuritySettings user={user || null} loading={isLoading} />
      </div>
    </div>
  );
}
