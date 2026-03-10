"use client";

import { FormEvent, useState } from "react";
import { AuthLayout } from "../AuthLayout";
import { fetchApi } from "@/lib/api";
import { AuthModal } from "@/components/ui/AuthModal";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    try {
      await fetchApi("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setShowModal(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title="Forgot your password?"
        subtitle="No worries. Enter your university email and we’ll send you a secure link to reset your password."
        showBackLink
        backHref="/auth/login"
        backLabel="Back to login"
        imageSrc="/auth/image copy 2.png"
        imageAlt="Book fair at Addis literature festival"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 italic">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[#3B2718]">
              University email
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

          <p className="text-[11px] text-[#8B6B4A]">
            Make sure you use the same email you registered with. If you no longer
            have access to it, contact the library team.
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending link..." : "Send reset link"}
          </button>
        </form>
      </AuthLayout>

      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Check your email"
        message="If an account exists with that email, we've sent a password reset link. Please check your inbox and follow the instructions."
        buttonLabel="Return to Login"
        buttonHref="/auth/login"
      />
    </>
  );
}
