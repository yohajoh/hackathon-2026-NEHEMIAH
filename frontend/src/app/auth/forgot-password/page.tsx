"use client";

import { FormEvent, useState } from "react";
import { AuthLayout } from "../AuthLayout";
import { fetchApi } from "@/lib/api";
import { AuthModal } from "@/components/ui/AuthModal";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
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
      const errorMessage = err instanceof Error ? err.message : t("auth.forgot_password.messages.default_error") || "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title={t("auth.forgot_password.title")}
        subtitle={t("auth.forgot_password.subtitle")}
        showBackLink
        backHref="/auth/login"
        backLabel={t("auth.forgot_password.back_label")}
        imageSrc="/auth/image copy 2.png"
        imageAlt={t("auth.forgot_password.image_alt") || "Book fair at Addis literature festival"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 italic">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[#111111]">
              {t("auth.forgot_password.email_label")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-[#E1DEE5] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#142B6F] outline-none focus:border-[#142B6F] focus:ring-2 focus:ring-[#FFD602] transition"
              placeholder={t("auth.forgot_password.email_placeholder")}
            />
          </div>

          <p className="text-[11px] text-[#142B6F]">
            {t("auth.forgot_password.help_text")}
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#142B6F] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#142B6F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD602] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? t("auth.forgot_password.submitting") : t("auth.forgot_password.submit")}
          </button>
        </form>
      </AuthLayout>

      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("auth.forgot_password.modal.title")}
        message={t("auth.forgot_password.modal.message")}
        buttonLabel={t("auth.forgot_password.modal.button_label")}
        buttonHref="/auth/login"
      />
    </>
  );
}
