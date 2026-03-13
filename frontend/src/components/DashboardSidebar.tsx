"use client";

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
import { API_BASE_URL, invalidateCurrentUserCache } from "@/lib/api";
import { toast } from "sonner";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface DashboardSidebarProps {
  variant?: "default" | "admin";
}

export const DashboardSidebar = ({ variant = "default" }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, activePersona, isLoading: loading, clearSession } = usePersona();

  const isAdminVariant = variant === "admin";

  const isStudent = activePersona === "STUDENT";
  const isAdmin = activePersona === "ADMIN" || isAdminVariant;
  const baseRoute = isStudent ? "/dashboard/student" : "/dashboard/admin";

  const studentNavItems = [
    {
      name: t("sidebar.dashboard"),
      href: baseRoute,
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: t("sidebar.history"),
      href: `${baseRoute}/history`,
      icon: <History size={20} />,
    },
    {
      name: t("sidebar.wishlist"),
      href: `${baseRoute}/wishlist`,
      icon: <Heart size={20} />,
    },
    {
      name: t("sidebar.reservations"),
      href: `${baseRoute}/reservations`,
      icon: <CalendarClock size={20} />,
    },
    {
      name: t("sidebar.digital"),
      href: `${baseRoute}/digital`,
      icon: <Library size={20} />,
    },
    {
      name: t("sidebar.payments"),
      href: `${baseRoute}/payments`,
      icon: <Wallet size={20} />,
    },
    {
      name: t("sidebar.notifications"),
      href: `${baseRoute}/notifications`,
      icon: <Bell size={20} />,
    },
    {
      name: t("sidebar.account_settings"),
      href: `${baseRoute}/settings`,
      icon: <Settings size={20} />,
    },
  ];

  const adminNavItems = [
    {
      name: t("sidebar.dashboard"),
      href: "/dashboard/admin",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: t("sidebar.users"),
      href: "/dashboard/admin/users",
      icon: <Users size={20} />,
    },
    {
      name: t("sidebar.books"),
      href: "/dashboard/admin/books",
      icon: <BookOpen size={20} />,
    },
    {
      name: t("sidebar.categories"),
      href: "/dashboard/admin/categories",
      icon: <Layers size={20} />,
    },
    {
      name: t("sidebar.authors"),
      href: "/dashboard/admin/authors",
      icon: <PenTool size={20} />,
    },
    {
      name: t("sidebar.borrowings"),
      href: "/dashboard/admin/borrowings",
      icon: <ArrowLeftRight size={20} />,
    },
    {
      name: t("sidebar.reservations"),
      href: "/dashboard/admin/reservations",
      icon: <CalendarCheck2 size={20} />,
    },
    {
      name: t("sidebar.overdue"),
      href: "/dashboard/admin/overdue",
      icon: <TriangleAlert size={20} />,
    },
    {
      name: t("sidebar.alerts"),
      href: "/dashboard/admin/alerts",
      icon: <TriangleAlert size={20} />,
    },
    {
      name: t("sidebar.activity_logs"),
      href: "/dashboard/admin/activity-logs",
      icon: <ClipboardList size={20} />,
    },
    {
      name: t("sidebar.reports"),
      href: "/dashboard/admin/reports",
      icon: <FileSpreadsheet size={20} />,
    },
    {
      name: t("sidebar.settings"),
      href: "/dashboard/admin/settings",
      icon: <Settings size={20} />,
    },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const activeClass = "bg-white/18 text-white font-bold border border-[#FFD602]/45 shadow-[0_10px_26px_rgba(0,0,0,0.22)]";

  const inactiveClass = "text-white/75 hover:bg-white/10 hover:text-white";

  const iconActiveClass = "text-white";
  const iconInactiveClass = "text-white/70 group-hover:text-white";

  const bgClass = "bg-[rgb(8_16_46/0.88)] border-white/10 backdrop-blur-xl";
  const textClass = "text-white";
  const secondaryTextClass = "text-white/70";

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      invalidateCurrentUserCache();
      clearSession();
      toast.success(t("sidebar.logout_success") || "Logged out successfully");
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      invalidateCurrentUserCache();
      clearSession();
      toast.error(t("sidebar.logout_failed") || "Logout failed. Redirecting to login.");
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

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-full lg:w-64 flex flex-col ${bgClass} border-r px-5 py-8 z-40`}
    >
      <div className="border-b border-white/15 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm bg-white/20 text-white">
            {user?.name ? getInitials(user.name) : loading ? ".." : "?"}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className={`text-sm font-bold truncate ${textClass}`}>{user?.name || "User"}</p>
            <p className={`text-[11px] truncate ${secondaryTextClass}`}>{user?.email || ""}</p>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <span className={isActive ? iconActiveClass : iconInactiveClass}>{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/15 pt-4">
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all group text-white/80 hover:text-white hover:bg-white/10"
        >
          <LogOut size={18} className="group-hover:text-white" />
          <span className="text-sm font-medium">{t("sidebar.logout")}</span>
        </button>
      </div>
    </aside>
  );
};
