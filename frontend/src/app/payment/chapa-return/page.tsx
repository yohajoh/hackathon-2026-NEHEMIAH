"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const getFirstParam = (params: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
};

export default function ChapaReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const target = useMemo(() => {
    const txRef = getFirstParam(searchParams, ["tx_ref", "trx_ref", "txRef", "reference"]);
    const status = getFirstParam(searchParams, ["status"]);

    const targetParams = new URLSearchParams();
    if (txRef) targetParams.set("tx_ref", txRef);
    if (status) targetParams.set("status", status);

    const query = targetParams.toString();
    return `/dashboard/student/payments${query ? `?${query}` : ""}`;
  }, [searchParams]);

  useEffect(() => {
    router.replace(target);
  }, [router, target]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Redirecting...</h1>
      <p>Finishing your payment and taking you back to your dashboard.</p>
    </div>
  );
}
