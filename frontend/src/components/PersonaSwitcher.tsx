"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { usePersona } from "@/components/providers/PersonaProvider";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (parts[0] || "?").slice(0, 2).toUpperCase();
};

export function PersonaSwitcher() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user, activePersona, canSwitchPersona, isLoading, switchPersonaRole } = usePersona();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const initials = useMemo(() => getInitials(user?.name || "?"), [user?.name]);
  const dashboardHref = activePersona === "ADMIN" ? "/dashboard/admin" : "/dashboard/student";

  if (isLoading || !user) {
    return null;
  }

  if (!canSwitchPersona) {
    return (
      <Link
        href={dashboardHref}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-sm font-black tracking-[0.18em] text-primary transition-all hover:border-primary"
        aria-label="Open dashboard"
        title={user.name}
      >
        {initials}
      </Link>
    );
  }

  const handleSwitch = async (role: "ADMIN" | "STUDENT") => {
    const nextPersona = await switchPersonaRole(role);
    setIsOpen(false);
    if (!nextPersona) {
      return;
    }
    router.replace(nextPersona === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 text-primary transition-all hover:border-primary"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Switch account"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black tracking-[0.18em] text-background">
          {initials}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 rounded-3xl border border-border bg-background p-3 shadow-xl">
          <div className="border-b border-border/70 px-3 pb-3">
            <p className="text-sm font-bold text-primary">{user.name}</p>
            <p className="truncate text-xs text-secondary">{user.email}</p>
          </div>
          <div className="px-3 pb-2 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Switch Account</p>
          </div>
          <div className="space-y-2">
            {(["ADMIN", "STUDENT"] as const).map((role) => {
              const isActive = activePersona === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSwitch(role)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-all ${
                    isActive ? "bg-primary text-background" : "bg-card text-primary hover:bg-muted"
                  }`}
                >
                  <span>{role === "ADMIN" ? "Admin" : "Student"}</span>
                  {isActive ? <Check size={16} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
