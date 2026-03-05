"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { fetchCurrentUser } from "@/lib/api";

export const Navbar = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

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
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary/30 bg-background text-sm font-bold text-primary">
              Br
            </div>
            <span className="text-lg font-serif font-bold tracking-tight text-primary">
              Birana
            </span>
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
            {user ? (
              <Link
                href={user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student"}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-secondary hover:text-primary hover:border-primary transition-all"
              >
                <User size={18} />
                <span className="text-sm font-medium truncate max-w-[140px]">
                  {user.name}
                </span>
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="User menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  <User size={18} />
                </button>
                <Link
                  href="/auth/login"
                  className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-background shadow-md hover:bg-accent transition-all active:scale-95"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
