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
  Bell,
  Wallet,
  CalendarClock,
  Library,
  Users,
  BookOpen,
  PenTool,
  ArrowLeftRight,
  CalendarCheck2,
  TriangleAlert,
  ClipboardList,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { fetchCurrentUser, API_BASE_URL } from "@/lib/api";

interface DashboardSidebarProps {
  variant?: "default" | "admin";
}

export const DashboardSidebar = ({ variant = "default" }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminVariant = variant === "admin";

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
  const isAdmin = user?.role === "ADMIN" || isAdminVariant;
  const baseRoute = isStudent ? "/dashboard/student" : "/dashboard/admin";

  const studentNavItems = [
    {
      name: "Dashboard",
      href: baseRoute,
      icon: <LayoutDashboard size={20} />,
    },
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
      name: "Reservations",
      href: `${baseRoute}/reservations`,
      icon: <CalendarClock size={20} />,
    },
    {
      name: "Digital Library",
      href: `${baseRoute}/digital`,
      icon: <Library size={20} />,
    },
    {
      name: "Payments",
      href: `${baseRoute}/payments`,
      icon: <Wallet size={20} />,
    },
    {
      name: "Notifications",
      href: `${baseRoute}/notifications`,
      icon: <Bell size={20} />,
    },
    {
      name: "Account Settings",
      href: `${baseRoute}/settings`,
      icon: <Settings size={20} />,
    },
  ];

  const adminNavItems = [
    {
      name: "Dashboard",
      href: "/dashboard/admin",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "Users",
      href: "/dashboard/admin/users",
      icon: <Users size={20} />,
    },
    {
      name: "Books",
      href: "/dashboard/admin/books",
      icon: <BookOpen size={20} />,
    },
    {
      name: "Categories",
      href: "/dashboard/admin/categories",
      icon: <Layers size={20} />,
    },
    {
      name: "Authors",
      href: "/dashboard/admin/authors",
      icon: <PenTool size={20} />,
    },
    {
      name: "Borrowings",
      href: "/dashboard/admin/borrowings",
      icon: <ArrowLeftRight size={20} />,
    },
    {
      name: "Reservations",
      href: "/dashboard/admin/reservations",
      icon: <CalendarCheck2 size={20} />,
    },
    {
      name: "Overdue",
      href: "/dashboard/admin/overdue",
      icon: <TriangleAlert size={20} />,
    },
    {
      name: "Alerts",
      href: "/dashboard/admin/alerts",
      icon: <TriangleAlert size={20} />,
    },
    {
      name: "Activity Logs",
      href: "/dashboard/admin/activity-logs",
      icon: <ClipboardList size={20} />,
    },
    {
      name: "Reports",
      href: "/dashboard/admin/reports",
      icon: <FileSpreadsheet size={20} />,
    },
    {
      name: "Settings",
      href: "/dashboard/admin/settings",
      icon: <Settings size={20} />,
    },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const activeClass = isAdminVariant 
    ? "bg-[#C2B199] text-[#2B1A10] font-bold shadow-sm" 
    : "bg-primary text-background font-bold shadow-lg";
  
  const inactiveClass = isAdminVariant
    ? "text-[#2B1A10]/60 hover:bg-[#F3EFE6] hover:text-[#2B1A10]"
    : "text-secondary hover:bg-muted/50 hover:text-primary";
  
  const iconActiveClass = isAdminVariant ? "text-[#2B1A10]" : "text-background";
  const iconInactiveClass = isAdminVariant 
    ? "text-[#2B1A10]/50 group-hover:text-[#2B1A10]" 
    : "text-secondary/60 group-hover:text-primary";
  
  const bgClass = isAdminVariant ? "bg-[#FDF8F0] border-[#E1D2BD]/50" : "bg-muted/30 border-border/50";
  const textClass = isAdminVariant ? "text-[#3B2718]" : "text-primary";
  const secondaryTextClass = isAdminVariant ? "text-[#AE9E85]" : "text-secondary/60";

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
    const loadingBgClass = isAdminVariant ? "bg-[#E1D2BD]/30" : "bg-muted/50";
    const loadingBorderClass = isAdminVariant ? "border-[#E1D2BD]/50" : "border-border/50";
    return (
      <aside className={`fixed left-0 top-0 h-screen w-full lg:w-72 flex flex-col ${bgClass} border-r ${loadingBorderClass} px-6 py-10 z-40`}>
        <div className="grow space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-12 ${loadingBgClass} rounded-xl`} />
          ))}
        </div>
        <div className={`mt-auto pt-8 border-t ${loadingBorderClass} space-y-6`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${loadingBgClass}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 ${loadingBgClass} rounded w-2/3`} />
              <div className={`h-3 ${loadingBgClass} rounded w-full`} />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`fixed left-0 top-0 h-screen w-full lg:w-72 flex flex-col ${bgClass} border-r ${isAdminVariant ? "border-[#E1D2BD]/50" : "border-border/50"} px-6 py-10 z-40`}>
      <nav className="grow space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                isActive
                  ? activeClass
                  : inactiveClass
              }`}
            >
              <span
                className={isActive ? iconActiveClass : iconInactiveClass}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto pt-8 border-t ${isAdminVariant ? "border-[#E1D2BD]/50" : "border-border/50"} space-y-6`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isAdminVariant ? "bg-[#E1D2BD] text-[#3B2718]" : "bg-secondary/20 text-primary"}`}>
            {user ? getInitials(user.name) : "?"}
          </div>
          <div className="space-y-0.5">
            <p className={`text-sm font-bold truncate ${textClass}`}>{user?.name || "User"}</p>
            <p className={`text-[11px] truncate ${secondaryTextClass}`}>{user?.email || ""}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className={`flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all group ${isAdminVariant ? "text-[#2B1A10]/60 hover:text-red-500 hover:bg-red-50" : "text-secondary hover:text-red-500 hover:bg-red-50"}`}
        >
          <LogOut size={20} className="group-hover:text-red-500" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
