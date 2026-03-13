"use client";

import { FormEvent, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/app/auth/AuthLayout";
import { fetchApi } from "@/lib/api";
import { AuthModal } from "@/components/ui/AuthModal";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await fetchApi(`/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password. The link may be expired.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title="Set a new password"
        subtitle="Create a strong password to secure your Brana account."
        showBackLink
        backHref="/auth/login"
        backLabel="Back to login"
        imageSrc="/auth/image copy 3.png"
        imageAlt="Wall with framed icons and books"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 italic">{error}</div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-xs font-medium text-[#111111]">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#142B6F] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
              placeholder="Create a strong password"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-medium text-[#111111]">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#142B6F] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
              placeholder="Repeat new password"
            />
          </div>

          <p className="text-[11px] text-[#142B6F]">
            Use at least 6 characters, and avoid sharing this password with anyone. You can always update it later from
            your profile.
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[#142B6F] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#142B6F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD602] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving password..." : "Save new password"}
          </button>
        </form>
      </AuthLayout>

      <AuthModal
        isOpen={isSuccess}
        onClose={() => router.push("/auth/login")}
        title="Password updated!"
        message="Your password has been changed successfully. You can now log in with your new password."
        imageSrc="/auth/image copy 3.png"
        buttonLabel="Login now"
        buttonHref="/auth/login"
      />
    </>
  );
}
