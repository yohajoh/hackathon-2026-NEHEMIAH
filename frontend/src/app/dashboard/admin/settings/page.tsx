"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSystemConfig, useUpdateSystemConfig } from "@/lib/hooks/useQueries";

export default function AdminSettingsPage() {
  const { data: configData, isLoading } = useSystemConfig();
  const updateConfig = useUpdateSystemConfig();

  const config = configData?.data?.config as {
    max_loan_days?: number;
    daily_fine?: number;
    max_books_per_user?: number;
    reservation_window_hr?: number;
    low_stock_threshold?: number;
    never_returned_days?: number;
    enable_notifications?: boolean;
  } | undefined;

  const [form, setForm] = useState({
    max_loan_days: String(config?.max_loan_days ?? 14),
    daily_fine: String(config?.daily_fine ?? 2),
    max_books_per_user: String(config?.max_books_per_user ?? 3),
    reservation_window_hr: String(config?.reservation_window_hr ?? 24),
    low_stock_threshold: String(config?.low_stock_threshold ?? 2),
    never_returned_days: String(config?.never_returned_days ?? 60),
    enable_notifications: config?.enable_notifications ?? true,
  });

  useEffect(() => {
    if (config) {
      const timer = setTimeout(() => {
        setForm({
          max_loan_days: String(config.max_loan_days),
          daily_fine: String(config.daily_fine),
          max_books_per_user: String(config.max_books_per_user),
          reservation_window_hr: String(config.reservation_window_hr),
          low_stock_threshold: String(config.low_stock_threshold),
          never_returned_days: String(config.never_returned_days ?? 60),
          enable_notifications: Boolean(config.enable_notifications),
        });
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [config]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig.mutateAsync({
        max_loan_days: Number(form.max_loan_days),
        daily_fine: Number(form.daily_fine),
        max_books_per_user: Number(form.max_books_per_user),
        reservation_window_hr: Number(form.reservation_window_hr),
        low_stock_threshold: Number(form.low_stock_threshold),
        never_returned_days: Number(form.never_returned_days),
        enable_notifications: form.enable_notifications,
      });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">System Settings</h1>
        <p className="text-[#142B6F] font-medium">Configure global rental and inventory rules.</p>
      </div>

      <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-6 space-y-5">
        {isLoading ? (
          <p className="text-sm text-[#142B6F]">Loading...</p>
        ) : (
          <>
            <Field label="Max Loan Days" value={form.max_loan_days} onChange={(value) => setForm((p) => ({ ...p, max_loan_days: value }))} />
            <Field label="Daily Fine (ETB)" value={form.daily_fine} onChange={(value) => setForm((p) => ({ ...p, daily_fine: value }))} />
            <Field label="Max Books Per User" value={form.max_books_per_user} onChange={(value) => setForm((p) => ({ ...p, max_books_per_user: value }))} />
            <Field label="Reservation Window (Hours)" value={form.reservation_window_hr} onChange={(value) => setForm((p) => ({ ...p, reservation_window_hr: value }))} />
            <Field label="Low Stock Threshold" value={form.low_stock_threshold} onChange={(value) => setForm((p) => ({ ...p, low_stock_threshold: value }))} />
            <Field label="Never Returned Alert (Days)" value={form.never_returned_days} onChange={(value) => setForm((p) => ({ ...p, never_returned_days: value }))} />

            <label className="flex items-center gap-3 text-sm font-medium text-[#111111]">
              <input
                type="checkbox"
                checked={form.enable_notifications}
                onChange={(e) => setForm((p) => ({ ...p, enable_notifications: e.target.checked }))}
              />
              Enable Notifications
            </label>

            <button type="submit" disabled={updateConfig.isPending} className="px-4 py-2.5 bg-[#142B6F] text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {updateConfig.isPending ? "Saving..." : "Save Settings"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-bold text-[#111111]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-[#E1DEE5] text-sm text-[#111111] focus:outline-none"
      />
    </label>
  );
}
