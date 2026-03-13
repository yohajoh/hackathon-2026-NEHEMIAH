"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();

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
      <div className="w-full max-w-sm space-y-4 px-6">
        <div className="h-5 w-44 rounded-lg bg-[#E1DEE5]/70 animate-pulse mx-auto" />
        <div className="h-16 rounded-2xl bg-[#E1DEE5]/70 animate-pulse" />
        <p className="text-secondary text-center">{t("common.dashboard_redirect")}</p>
      </div>
    </div>
  );
}
