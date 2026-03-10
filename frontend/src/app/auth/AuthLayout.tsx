"use client";

import React, { PropsWithChildren, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  showBackLink?: boolean;
  backHref?: string;
  backLabel?: string;
  imageSrc: string;
  imageAlt?: string;
  imageTitle?: string;
  imageTagline?: string;
  useMobileBackgroundImage?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  showBackLink,
  backHref = "/auth/login",
  backLabel = "Back to login",
  imageSrc,
  imageAlt = "Brana library imagery",
  imageTitle = "The Digital Sanctuary",
  imageTagline = "Preserving spiritual and academic books for generations.",
  useMobileBackgroundImage = true,
}) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("brana-theme") === "dark";
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("brana-theme", next ? "dark" : "light");
      }
      return next;
    });
  };

  return (
    <div
      className={`relative min-h-screen transition-colors ${
        isDark
          ? "dark bg-slate-950 text-slate-100"
          : "bg-[#FFF2D9] text-[#3B2718]"
      }`}
    >
      {/* Mobile background illustration */}
      {useMobileBackgroundImage && (
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-cover opacity-30 lg:hidden"
          style={{ backgroundImage: `url(${imageSrc})` }}
        />
      )}

      <div className="relative flex min-h-screen items-stretch justify-center px-0 py-0 lg:px-0">
        <div className="flex w-full flex-col lg:flex-row">
          {/* Illustration on the left for desktop (takes half of the screen) */}
          <div className="relative hidden w-1/2 lg:block">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#FFF2D9]/80 via-[#FFF2D9]/80 to-transparent dark:from-slate-950/80 dark:via-slate-950/80 dark:to-transparent" />
            <div className="pointer-events-none absolute bottom-10 left-10 max-w-sm space-y-2 text-[#3B2718]">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-700/80">
                Brana Library
              </p>
              <h2 className="text-2xl font-semibold leading-snug drop-shadow-md">
                {imageTitle}
              </h2>
              <p className="text-sm text-[#5F422A] drop-shadow-sm">
                {imageTagline}
              </p>
            </div>
          </div>

          {/* Content on the right */}
          <div className="flex w-full items-center justify-center px-4 py-8 lg:w-1/2 lg:px-10">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight">
                    Birana
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isDark ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span>{isDark ? "Dark" : "Light"} mode</span>
                </button>
              </div>

              <div className="mb-7 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-sm leading-relaxed text-[#8B6B4A] dark:text-slate-300">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              <div className="space-y-6">{children}</div>

              {showBackLink && (
                <div className="mt-6 pt-5 border-t border-[#E7D7C3] dark:border-slate-800">
                  <p className="text-center text-xs text-[#8B6B4A] dark:text-slate-400">
                    <Link
                      href={backHref}
                      className="font-medium text-[#4A2B0B] hover:text-[#754019] dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                    >
                      {backLabel}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
