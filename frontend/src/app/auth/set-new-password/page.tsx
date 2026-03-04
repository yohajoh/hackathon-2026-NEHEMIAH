"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../AuthLayout";

export default function SetNewPasswordPage() {
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Here you would confirm the reset token and update the password.
    router.push("/auth/password-changed");
  };

  return (
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
        <div className="space-y-1.5">
          <label
            htmlFor="studentId"
            className="text-xs font-medium text-[#3B2718]"
          >
            ID / Matric number
          </label>
          <input
            id="studentId"
            name="studentId"
            required
            className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
            placeholder="e.g. ASTU/12345/16"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="newPassword"
            className="text-xs font-medium text-[#3B2718]"
          >
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
            placeholder="Create a strong password"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-[#3B2718]"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
            placeholder="Repeat new password"
          />
        </div>

        <p className="text-[11px] text-[#8B6B4A]">
          Use at least 8 characters, and avoid sharing this password with
          anyone. You can always update it later from your profile.
        </p>

        <button
          type="submit"
          className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
        >
          Save new password
        </button>
      </form>
    </AuthLayout>
  );
}
