"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api";

export function AdminRouteGuard() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!mounted) return;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const roles = user.roles || [user.role];
        if (!roles.includes("ADMIN") || user.activePersona !== "ADMIN") {
          router.replace("/dashboard/student");
        }
      } catch {
        if (mounted) router.replace("/auth/login");
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  return null;
}
