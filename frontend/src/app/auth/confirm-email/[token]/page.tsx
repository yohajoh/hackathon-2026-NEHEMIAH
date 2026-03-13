"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/app/auth/AuthLayout";
import { fetchApi } from "@/lib/api";
import { notifyAuthChange } from "@/lib/auth";

export default function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const confirm = async () => {
      try {
        await fetchApi(`/auth/confirm-email/${token}`);
        setStatus("success");
        setMessage("Email confirmed successfully! You can now log in.");
        // Notify other tabs to redirect
        notifyAuthChange("EMAIL_CONFIRMED");
      } catch (err: unknown) {
        setStatus("error");
        const errorMessage = err instanceof Error ? err.message : "Invalid or expired confirmation link.";
        setMessage(errorMessage);
      }
    };

    confirm();
  }, [token]);

  return (
    <AuthLayout
      title="Email Confirmation"
      subtitle={message}
      showBackLink
      backHref="/auth/login"
      backLabel="Go to Login"
      imageSrc="/auth/image.png"
      imageAlt="Ethiopian library"
    >
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        {status === "loading" && (
          <div className="w-full max-w-xs space-y-2">
            <div className="h-3 w-3/4 mx-auto rounded-full bg-[#E1DEE5] animate-pulse" />
            <div className="h-3 w-1/2 mx-auto rounded-full bg-[#E1DEE5] animate-pulse" />
          </div>
        )}
        
        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="rounded-xl bg-[#142B6F] px-8 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[#142B6F] transition"
            >
              Sign in now
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="rounded-xl border border-[#142B6F] px-8 py-2.5 text-sm font-medium text-[#142B6F] hover:bg-[#142B6F] hover:text-white transition"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
