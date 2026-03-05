"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Heart,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  {
    name: "Borrowing History",
    href: "/dashboard/history",
    icon: <History size={20} />,
  },
  { name: "Wish List", href: "/dashboard/wishlist", icon: <Heart size={20} /> },
  {
    name: "Account Settings",
    href: "/dashboard/settings",
    icon: <Settings size={20} />,
  },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-72 flex flex-col h-full bg-muted/30 border-r border-border/50 px-6 py-10 min-h-[calc(100vh-80px)]">
      {/* Navigation */}
      <nav className="grow space-y-2">
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

      {/* User Quick Profile */}
      <div className="mt-auto pt-8 border-t border-border/50 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold text-sm">
            AU
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-primary">Anonymous User</p>
            <p className="text-[11px] text-secondary/60">anonymous@gamil.com</p>
          </div>
        </div>

        <button className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-secondary hover:text-red-500 hover:bg-red-50 transition-all group">
          <LogOut size={20} className="group-hover:text-red-500" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
