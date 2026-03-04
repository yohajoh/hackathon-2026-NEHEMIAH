"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../AuthLayout";

export default function VerificationCodePage() {
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Here you would verify the code with the backend.
    router.push("/auth/login");
  };

  const handleResend = () => {
    // Here you would call the resend API.
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We just sent a 6‑digit verification code to your university email. Enter the code to activate your Brana account."
      showBackLink
      backHref="/auth/create-account"
      backLabel="Back to create account"
      imageSrc="/auth/image copy 4.png"
      imageAlt="Spiritual reading corner with open book"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between text-[11px] text-[#8B6B4A]">
            <span>Verification code</span>
            <span>Sent to you@astu.edu.et</span>
          </div>
          <div className="grid grid-cols-6 gap-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="h-11 rounded-xl border border-[#D2BFA3] bg-white text-center text-sm text-[#3B2718] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              />
            ))}
          </div>
          <p className="text-[11px] text-[#8B6B4A]">
            The code expires in{" "}
            <span className="font-medium text-[#4A2B0B]">05:00</span>.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
        >
          Verify and continue
        </button>

        <button
          type="button"
          onClick={handleResend}
          className="w-full text-center text-xs font-medium text-[#4A2B0B] hover:text-[#754019] transition-colors"
        >
          Didn&apos;t receive the code? Resend
        </button>
      </form>
    </AuthLayout>
  );
}
