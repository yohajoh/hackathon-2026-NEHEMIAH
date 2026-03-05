"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import { fetchApi, API_BASE_URL } from "@/lib/api";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("confirmed") === "true") {
      setSuccess("Email confirmed successfully! You can now log in.");
    }
    const err = searchParams.get("error");
    if (err === "auth_failed") setError("Google sign-in failed. Please try again.");
    if (err === "auth_timeout") setError("Google sign-in timed out. Please try again.");
  }, [searchParams]);

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
      router.push(role === "ADMIN" ? "/dashboard/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <AuthLayout
      title="Hello, Welcome Back"
      subtitle="Don’t have an account? Sign up to start renting and reviewing books."
      showBackLink
      backHref="/auth/create-account"
      backLabel="New here? Create an account"
      imageSrc="/auth/image.png"
      imageAlt="Shelves of Ethiopian books"
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
          <label htmlFor="email" className="text-xs font-medium text-[#3B2718]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
            placeholder="you@astu.edu.et"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="password" className="font-medium text-[#3B2718]">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[#4A2B0B] hover:text-[#754019] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
            placeholder="Enter your password"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-[#C4AF90] bg-transparent accent-[#4A2B0B] focus:ring-0"
          />
          <label
            htmlFor="remember"
            className="text-xs text-[#8B6B4A] leading-snug cursor-pointer"
          >
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Log in"}
        </button>

        <div className="flex items-center gap-3 pt-3 text-[11px] text-[#8B6B4A]">
          <span className="h-px flex-1 bg-[#E1D2BD]" />
          <span>Or continue with</span>
          <span className="h-px flex-1 bg-[#E1D2BD]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#D2BFA3] bg-white px-4 py-2.5 text-sm font-medium text-[#3B2718] hover:bg-[#FFF7EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1C6A1] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
        >
          <span className="h-4 w-4 rounded-full bg-[#DB4437]" />
          <span>Continue with Google</span>
        </button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF2D9]" />}>
      <LoginContent />
    </Suspense>
  );
}
