"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { AdminNotificationDropdown } from "@/components/notifications/AdminNotificationDropdown";
import Image from "next/image";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Globe } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const pathname = usePathname();
  const { user } = usePersona();
  const { language, setLanguage, t } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const isStudentDashboard = pathname.startsWith("/dashboard/student");
  const isAdminDashboard = pathname.startsWith("/dashboard/admin");
  const isDashboard = pathname.startsWith("/dashboard/");

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "am", name: "አማርኛ" },
    { code: "or", name: "Oromiffa" },
  ];

  const headerClass = isDashboard
    ? "fixed top-0 left-0 right-0 lg:left-64 z-[70] w-auto border-b border-border/40 bg-background/78 backdrop-blur-xl"
    : "sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl pt-4 pb-2";

  const containerClass = isDashboard
    ? "mx-auto flex w-full items-center justify-between px-4 lg:px-6 py-2"
    : "mx-auto flex max-w-7xl items-center justify-between px-6";

  const shellClass = isDashboard
    ? "flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-4 py-2 shadow-[0_8px_22px_rgba(20,43,111,0.10)]"
    : "flex w-full items-center justify-between rounded-full border border-border/70 bg-card/70 px-6 py-2.5 shadow-[0_10px_32px_rgba(20,43,111,0.10)]";

  return (
    <header className={headerClass}>
      <div className={containerClass}>
        <div className={shellClass}>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/book.svg" alt="Book icon" width={24} height={24} />
            <span className="text-lg font-serif font-bold tracking-tight text-primary">ብራና</span>
          </Link>

          {!isDashboard && (
            <nav className="hidden items-center gap-10 text-sm font-medium text-secondary md:flex">
              <Link
                href="/"
                className={`relative transition-colors ${
                  isActive("/") && !pathname.startsWith("/books") && !pathname.startsWith("/about")
                    ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
                    : "hover:text-primary"
                }`}
              >
                {t("navbar.home")}
              </Link>
              <Link
                href="/books"
                className={`relative transition-colors ${
                  isActive("/books")
                    ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
                    : "hover:text-primary"
                }`}
              >
                {t("navbar.books")}
              </Link>
              <Link
                href="/about"
                className={`relative transition-colors ${
                  isActive("/about")
                    ? "text-primary font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-primary after:rounded-full"
                    : "hover:text-primary"
                }`}
              >
                {t("navbar.about")}
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary hover:border-primary transition-all active:scale-95"
              >
                <Globe size={14} />
                <span className="uppercase">{language}</span>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-2xl border border-border bg-card p-2 shadow-xl animate-in fade-in zoom-in duration-200">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any);
                        setIsLangOpen(false);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                        language === lang.code ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  {t("navbar.login")}
                </Link>
                <Link
                  href="/auth/create-account"
                  className="rounded-full px-6 py-2 text-sm font-bold border border-accent text-accent shadow-md hover:bg-accent hover:text-background transition-all active:scale-95"
                >
                  {t("navbar.signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
