"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

function ChapaReturnContent() {
  const searchParams = useSearchParams();
  const txRef = useMemo(
    () =>
      searchParams.get("tx_ref") ||
      searchParams.get("trx_ref") ||
      searchParams.get("reference") ||
      searchParams.get("txRef"),
    [searchParams],
  );

  const [message, setMessage] = useState("Finalizing your payment...");
  const targetUrl = useMemo(() => {
    if (!txRef) return "/dashboard/student/payments";
    return `/dashboard/student/payments?tx_ref=${encodeURIComponent(txRef)}`;
  }, [txRef]);

  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) return;

    const absoluteUrl = new URL(targetUrl, window.location.origin).toString();

    const doRedirect = () => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      // If inside a frame (e.g., Chapa webview), try to break out.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = absoluteUrl;
          return;
        }
      } catch {
        // Cross-origin frame — fall through to current-window redirect.
      }

      window.location.href = absoluteUrl;
    };

    if (!txRef) {
      setMessage("Payment reference not found. Redirecting...");
      doRedirect();
      return;
    }

    // Guarantee redirect within 2 seconds regardless of verification.
    const fallbackTimer = window.setTimeout(() => {
      setMessage("Redirecting to your payments...");
      doRedirect();
    }, 2000);

    // Attempt verification in the background (non-blocking).
    const verify = async () => {
      try {
        await Promise.race([
          fetchApi(`/payments/verify/${encodeURIComponent(txRef)}`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 3000),
          ),
        ]);
      } catch {
        // Verification failed or timed out — irrelevant, we redirect anyway.
      }
      if (hasNavigated.current) return;
      setMessage("Redirecting to your payments...");
      clearTimeout(fallbackTimer);
      doRedirect();
    };

    verify();

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [targetUrl, txRef]);

  return (
    <section className="mx-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
      <h1 className="text-2xl font-serif font-extrabold text-primary">Completing Payment</h1>
      <p className="mt-3 text-sm text-secondary">{message}</p>
      <a
        href={targetUrl}
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background"
      >
        Continue Now
      </a>
      <p className="mt-2 text-xs text-secondary/70">If redirect does not happen automatically, click above.</p>
    </section>
  );
}

function ChapaReturnFallback() {
  return (
    <section className="mx-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
      <h1 className="text-2xl font-serif font-extrabold text-primary">Completing Payment</h1>
      <p className="mt-3 text-sm text-secondary">Finalizing your payment...</p>
    </section>
  );
}

export default function ChapaReturnPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <Suspense fallback={<ChapaReturnFallback />}>
        <ChapaReturnContent />
      </Suspense>
    </main>
  );
}
