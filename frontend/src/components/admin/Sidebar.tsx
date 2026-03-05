"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ArrowLeftRight,
  LogOut,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Books", href: "/admin/books", icon: BookOpen },
  { name: "Borrowings", href: "/admin/borrowings", icon: ArrowLeftRight },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#FDFCF8] border-r border-[#E8E2D4] flex flex-col pt-8 pb-6 px-4 fixed left-0 top-0">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 mb-10">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-serif text-xl">B</span>
        </div>
        <span className="text-xl font-serif font-bold text-primary">
          Birana
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isActive
                  ? "bg-[#D4C8B8] text-primary"
                  : "text-primary/60 hover:bg-[#F3EFE6] hover:text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  size={20}
                  className={
                    isActive
                      ? "text-primary"
                      : "text-primary/60 group-hover:text-primary"
                  }
                />
                <span className="font-medium">{item.name}</span>
              </div>
              {isActive && <ChevronRight size={16} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="mt-auto space-y-4">
        <div className="px-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8E2D4] flex items-center justify-center text-primary font-bold">
            AU
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary truncate">
              Anonymous User
            </p>
            <p className="text-xs text-primary/50 truncate">
              anonymous@gmail.com
            </p>
          </div>
        </div>

        <button className="w-full flex items-center gap-3 px-4 py-3 text-primary/60 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
