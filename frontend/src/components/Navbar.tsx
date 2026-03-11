"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { AdminNotificationDropdown } from "@/components/notifications/AdminNotificationDropdown";
import Image from "next/image";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { usePersona } from "@/components/providers/PersonaProvider";

export const Navbar = () => {
  const pathname = usePathname();
  const { user } = usePersona();
  const isStudentDashboard = pathname.startsWith("/dashboard/student");
  const isAdminDashboard = pathname.startsWith("/dashboard/admin");

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full pt-4 pb-2 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <div className="flex w-full items-center justify-between rounded-full border border-border bg-card/50 px-6 py-2.5 shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/book.svg" alt="Book icon" width={24} height={24} />
            <span className="text-lg font-serif font-bold tracking-tight text-primary">ብራና</span>
          </Link>

          <nav className="hidden items-center gap-10 text-sm font-medium text-secondary md:flex">
            <Link
              href="/"
              className={`relative transition-colors ${
                isActive("/") && !pathname.startsWith("/books") && !pathname.startsWith("/about")
                  ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
                  : "hover:text-primary"
              }`}
            >
              Home
            </Link>
            <Link
              href="/books"
              className={`relative transition-colors ${
                isActive("/books")
                  ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
                  : "hover:text-primary"
              }`}
            >
              Books
            </Link>
            <Link
              href="/about"
              className={`relative transition-colors ${
                isActive("/about")
                  ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
                  : "hover:text-primary"
              }`}
            >
              About Us
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isStudentDashboard && <NotificationDropdown />}
            {isAdminDashboard && <AdminNotificationDropdown />}
            {user ? (
              <PersonaSwitcher />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-background shadow-md hover:bg-background
                   hover:text-primary border border-primary transition-all active:scale-95"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/create-account"
                  className="rounded-full px-6 py-2 text-sm font-bold border border-accent text-accent shadow-md hover:bg-accent hover:text-background transition-all active:scale-95"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
