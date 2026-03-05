"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Heart,
  Settings,
  LogOut,
} from "lucide-react";
import { fetchCurrentUser, API_BASE_URL } from "@/lib/api";

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await fetchCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const isStudent = user?.role === "STUDENT";
  const baseRoute = isStudent ? "/dashboard/student" : "/dashboard/admin";

  const navItems = [
    {
      name: "Dashboard",
      href: baseRoute,
      icon: <LayoutDashboard size={20} />,
    },
    ...(isStudent ? [
      {
        name: "Borrowing History",
        href: `${baseRoute}/history`,
        icon: <History size={20} />,
      },
      { 
        name: "Wish List", 
        href: `${baseRoute}/wishlist`, 
        icon: <Heart size={20} /> 
      },
      {
        name: "Account Settings",
        href: `${baseRoute}/settings`,
        icon: <Settings size={20} />,
      },
    ] : []),
  ];

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth/login");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <aside className="fixed left-0 top-0 h-screen w-full lg:w-72 flex flex-col bg-muted/30 border-r border-border/50 px-6 py-10 z-40">
        <div className="grow space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-xl" />
          ))}
        </div>
        <div className="mt-auto pt-8 border-t border-border/50 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/50 rounded w-2/3" />
              <div className="h-3 bg-muted/50 rounded w-full" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-full lg:w-72 flex flex-col bg-muted/30 border-r border-border/50 px-6 py-10 z-40">
      <nav className="grow space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                isActive
                  ? "bg-primary text-background font-bold shadow-lg"
                  : "text-secondary hover:bg-muted/50 hover:text-primary"
              }`}
            >
              <span
                className={`${isActive ? "text-background" : "text-secondary/60 group-hover:text-primary"}`}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-border/50 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold text-sm">
            {user ? getInitials(user.name) : "?"}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-primary truncate">{user?.name || "User"}</p>
            <p className="text-[11px] text-secondary/60 truncate">{user?.email || ""}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-secondary hover:text-red-500 hover:bg-red-50 transition-all group"
        >
          <LogOut size={20} className="group-hover:text-red-500" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
