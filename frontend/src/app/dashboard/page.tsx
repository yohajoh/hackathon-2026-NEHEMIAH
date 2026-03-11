"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkUserAndRedirect() {
      try {
        const user = await fetchCurrentUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Redirect based on currently active persona
        if (user.activePersona === "ADMIN") {
          router.push("/dashboard/admin");
        } else {
          router.push("/dashboard/student");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/auth/login");
      }
    }

    checkUserAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-secondary">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
