"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    max_loan_days: "14",
    daily_fine: "2",
    max_books_per_user: "3",
    reservation_window_hr: "24",
    low_stock_threshold: "2",
    enable_notifications: true,
  });

  useEffect(() => {
    fetchApi("/system-config")
      .then((data) => {
        const config = data?.data?.config;
        if (config) {
          setForm({
            max_loan_days: String(config.max_loan_days),
            daily_fine: String(config.daily_fine),
            max_books_per_user: String(config.max_books_per_user),
            reservation_window_hr: String(config.reservation_window_hr),
            low_stock_threshold: String(config.low_stock_threshold),
            enable_notifications: Boolean(config.enable_notifications),
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi("/system-config", {
        method: "PATCH",
        body: JSON.stringify({
          max_loan_days: Number(form.max_loan_days),
          daily_fine: Number(form.daily_fine),
          max_books_per_user: Number(form.max_books_per_user),
          reservation_window_hr: Number(form.reservation_window_hr),
          low_stock_threshold: Number(form.low_stock_threshold),
          enable_notifications: form.enable_notifications,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">System Settings</h1>
        <p className="text-[#AE9E85] font-medium">Configure global rental and inventory rules.</p>
      </div>

      <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-[#E1D2BD]/50 p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-[#AE9E85]">Loading...</p>
        ) : (
          <>
            <Field label="Max Loan Days" value={form.max_loan_days} onChange={(value) => setForm((p) => ({ ...p, max_loan_days: value }))} />
            <Field label="Daily Fine (ETB)" value={form.daily_fine} onChange={(value) => setForm((p) => ({ ...p, daily_fine: value }))} />
            <Field label="Max Books Per User" value={form.max_books_per_user} onChange={(value) => setForm((p) => ({ ...p, max_books_per_user: value }))} />
            <Field label="Reservation Window (Hours)" value={form.reservation_window_hr} onChange={(value) => setForm((p) => ({ ...p, reservation_window_hr: value }))} />
            <Field label="Low Stock Threshold" value={form.low_stock_threshold} onChange={(value) => setForm((p) => ({ ...p, low_stock_threshold: value }))} />

            <label className="flex items-center gap-3 text-sm font-medium text-[#2B1A10]">
              <input
                type="checkbox"
                checked={form.enable_notifications}
                onChange={(e) => setForm((p) => ({ ...p, enable_notifications: e.target.checked }))}
              />
              Enable Notifications
            </label>

            <button type="submit" disabled={saving} className="px-4 py-2.5 bg-[#2B1A10] text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
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
      <span className="text-sm font-bold text-[#2B1A10]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-[#E1D2BD] text-sm text-[#2B1A10] focus:outline-none"
      />
    </label>
  );
}
