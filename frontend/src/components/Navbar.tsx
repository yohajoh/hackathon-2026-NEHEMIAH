"use client";

import React from "react";
import Link from "next/link";
import { User } from "lucide-react";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full pt-4 pb-2 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <div className="flex w-full items-center justify-between rounded-full border border-border bg-card/50 px-6 py-2.5 shadow-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary/30 bg-background text-sm font-bold text-primary">
              Br
            </div>
            <span className="text-lg font-serif font-bold tracking-tight text-primary">
              Birana
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-10 text-sm font-medium text-secondary md:flex">
            <Link
              href="/"
              className="relative text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
            >
              Home
            </Link>
            <Link
              href="/books"
              className="hover:text-primary transition-colors"
            >
              Books
            </Link>
            <Link
              href="/about"
              className="hover:text-primary transition-colors"
            >
              About Us
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-secondary hover:text-primary hover:border-primary transition-all">
              <User size={18} />
            </button>
            <Link
              href="/auth/login"
              className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-background shadow-md hover:bg-accent transition-all active:scale-95"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
