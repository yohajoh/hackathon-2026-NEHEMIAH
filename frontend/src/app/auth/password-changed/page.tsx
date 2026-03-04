"use client";

import { useRouter } from "next/navigation";
import { AuthLayout } from "../AuthLayout";

export default function PasswordChangedPage() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/auth/login");
  };

  return (
    <AuthLayout
      title="Password changed successfully"
      subtitle="Your Brana account is now secured with your new password. Use it next time you sign in."
      showBackLink
      backHref="/auth/login"
      backLabel="Back to login"
      imageSrc="/auth/image copy 5.png"
      imageAlt="Prayer corner with icons and books"
    >
      <div className="space-y-4">
        <p className="text-sm text-[#8B6B4A] dark:text-slate-300">
          If this wasn&apos;t you, contact the ASTU Gibi Gubae library team
          immediately so they can help secure your account.
        </p>
        <button
          type="button"
          onClick={handleContinue}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
        >
          Back to login
        </button>
      </div>
    </AuthLayout>
  );
}
