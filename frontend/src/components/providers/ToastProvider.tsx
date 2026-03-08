"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: "white",
          border: "1px solid #E1D2BD",
          borderRadius: "12px",
          padding: "12px 16px",
        },
      }}
    />
  );
}
