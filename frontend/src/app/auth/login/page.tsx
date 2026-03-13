"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import { fetchApi, API_BASE_URL } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("confirmed") === "true") {
      setSuccess(t("auth.login.messages.email_confirmed"));
    }
    const err = searchParams.get("error");
    if (err === "auth_failed") setError(t("auth.login.messages.google_failed"));
    if (err === "auth_timeout") setError(t("auth.login.messages.google_timeout"));
  }, [searchParams, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const role = data?.data?.user?.role ?? "STUDENT";
      router.push(role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t("auth.login.messages.invalid_credentials");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <Suspense fallback={null}>
      <AuthLayout
        title={t("auth.login.title")}
        subtitle={t("auth.login.subtitle")}
        showBackLink
        backHref="/auth/create-account"
        backLabel={t("auth.login.back_label")}
        imageSrc="/auth/image.png"
        imageAlt={t("auth.login.image_alt") || "Shelves of Ethiopian books"}
        useMobileBackgroundImage={false}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 italic">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-600 border border-emerald-100 italic">
              {success}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[#111111]">
              {t("auth.login.identity_label")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#142B6F] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
              placeholder={t("auth.login.identity_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="password" className="font-medium text-[#111111]">
                {t("auth.login.password_label")}
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-[#142B6F] hover:text-[#142B6F] transition-colors"
              >
                {t("auth.login.forgot_password")}
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#142B6F] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
              placeholder={t("auth.login.password_placeholder")}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-[#E1DEE5] bg-transparent accent-[#142B6F] focus:ring-0"
            />
            <label
              htmlFor="remember"
              className="text-xs text-[#142B6F] leading-snug cursor-pointer"
            >
              {t("auth.login.remember_me")}
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#142B6F] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#142B6F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD602] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>

          <div className="flex items-center gap-3 pt-3 text-[11px] text-[#142B6F]">
            <span className="h-px flex-1 bg-[#E1DEE5]" />
            <span>{t("auth.login.or_continue_with")}</span>
            <span className="h-px flex-1 bg-[#E1DEE5]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E1DEE5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] hover:bg-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD602] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
          >
            <span className="h-4 w-4 rounded-full bg-[#DB4437]" />
            <span>{t("auth.login.google_login")}</span>
          </button>
        </form>
      </AuthLayout>
    </Suspense>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFFFF]" />}>
      <LoginContent />
    </Suspense>
  );
}
