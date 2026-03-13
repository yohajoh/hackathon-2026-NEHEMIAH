"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useStatsOverview, useStatsTargets, useUpdateTargets } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type WeeklyPoint = { week_start: string; count: number };

type GoalProgress = {
  target: number;
  actual: number;
  progress: number;
};

type Overview = {
  users: { total: number; newThisMonth: number; blocked: number };
  books: { total: number; available: number; outOfStock: number };
  rentals: { active: number; overdue: number; reservations: number; completed: number };
  revenue: { thisMonth: number; growth: number };
  monthlyTargets: {
    progress: {
      rentals: GoalProgress;
      activeReaders: GoalProgress;
      onTimeReturns: GoalProgress;
      newBooks: GoalProgress;
    };
  };
  trends: { rentalsPerWeek: WeeklyPoint[] };
};

const defaultOverview: Overview = {
  users: { total: 0, newThisMonth: 0, blocked: 0 },
  books: { total: 0, available: 0, outOfStock: 0 },
  rentals: { active: 0, overdue: 0, reservations: 0, completed: 0 },
  revenue: { thisMonth: 0, growth: 0 },
  monthlyTargets: {
    progress: {
      rentals: { target: 0, actual: 0, progress: 0 },
      activeReaders: { target: 0, actual: 0, progress: 0 },
      onTimeReturns: { target: 0, actual: 0, progress: 0 },
      newBooks: { target: 0, actual: 0, progress: 0 },
    },
  },
  trends: { rentalsPerWeek: [] },
};

function ProgressRow({ label, item }: { label: string; item: GoalProgress }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#111111]">{label}</span>
        <span className="text-[#142B6F]">
          {item.actual} / {item.target}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#E1DEE5] overflow-hidden">
        <div className="h-full bg-[#142B6F]" style={{ width: `${Math.min(100, item.progress)}%` }} />
      </div>
    </div>
  );
}

function LineChart({ points }: { points: WeeklyPoint[] }) {
  const { t } = useLanguage();
  const width = 680;
  const height = 220;
  const pad = 24;
  const safePoints = points.length > 0 ? points : [{ week_start: "", count: 0 }];
  const max = Math.max(...safePoints.map((p) => p.count), 1);

  const mapped = safePoints.map((p, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, safePoints.length - 1);
    const y = height - pad - (p.count / max) * (height - pad * 2);
    return { x, y, label: p.week_start, value: p.count };
  });

  const d = mapped.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4">
      <h3 className="text-sm font-bold text-[#111111] mb-3">{t("dashboard.rentals_per_week")}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52">
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad + (i * (height - pad * 2)) / 4;
          return <line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#E1DEE5" strokeWidth="1" />;
        })}
        <path d={d} fill="none" stroke="#142B6F" strokeWidth="3" />
        {mapped.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#111111" />
        ))}
      </svg>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[#142B6F] mt-2">
        {mapped.map((p, i) => (
          <div key={i} className="truncate">{p.label || t("sidebar.history").split(" ")[0]}: {p.value}</div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    target_rentals: "",
    target_active_readers: "",
    target_on_time_returns: "",
    target_new_books: "",
  });

  const { data: overviewData, isLoading: overviewLoading } = useStatsOverview();
  const { data: targetsData } = useStatsTargets();
  const updateTargets = useUpdateTargets();

  const overview = useMemo(() => {
    return (overviewData?.data as Overview) || defaultOverview;
  }, [overviewData]);

  const target = targetsData?.data?.target as {
    target_rentals?: number;
    target_active_readers?: number;
    target_on_time_returns?: number;
    target_new_books?: number;
  } | undefined;

  // Load targets into form when data is available
  useEffect(() => {
    if (target) {
      const timer = setTimeout(() => {
        setForm({
          target_rentals: String(target.target_rentals ?? 0),
          target_active_readers: String(target.target_active_readers ?? 0),
          target_on_time_returns: String(target.target_on_time_returns ?? 0),
          target_new_books: String(target.target_new_books ?? 0),
        });
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [target]);

  const loading = overviewLoading;

  const summary = useMemo(
    () => [
      { label: t("dashboard.stats.students"), value: overview.users.total },
      { label: t("dashboard.stats.books"), value: overview.books.total },
      { label: t("dashboard.stats.active_rentals"), value: overview.rentals.active },
      { label: t("dashboard.stats.overdue"), value: overview.rentals.overdue },
      { label: t("dashboard.stats.reservations"), value: overview.rentals.reservations },
      { label: t("dashboard.stats.revenue"), value: `${overview.revenue.thisMonth} ETB` },
    ],
    [overview, t],
  );

  const saveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTargets.mutateAsync({
        target_rentals: Number(form.target_rentals || 0),
        target_active_readers: Number(form.target_active_readers || 0),
        target_on_time_returns: Number(form.target_on_time_returns || 0),
        target_new_books: Number(form.target_new_books || 0),
      });
      toast.success("Targets saved successfully");
    } catch {
      toast.error("Failed to save targets");
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">{t("dashboard.analytics_title")}</h1>
        <p className="text-[#142B6F] font-medium">{t("dashboard.analytics_subtitle")}</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#142B6F]">{t("dashboard.loading")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {summary.map((item) => (
              <div key={item.label} className="bg-white border border-[#E1DEE5]/50 rounded-xl p-3">
                <p className="text-[11px] uppercase tracking-wider text-[#142B6F] font-bold">{item.label}</p>
                <p className="text-2xl font-black text-[#111111] mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <LineChart points={overview.trends?.rentalsPerWeek || []} />
            </div>
            <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#111111]">{t("dashboard.goal_progress")}</h3>
              <ProgressRow label={t("dashboard.targets.rentals")} item={overview.monthlyTargets.progress.rentals} />
              <ProgressRow label={t("dashboard.targets.active_readers")} item={overview.monthlyTargets.progress.activeReaders} />
              <ProgressRow label={t("dashboard.targets.on_time_returns")} item={overview.monthlyTargets.progress.onTimeReturns} />
              <ProgressRow label={t("dashboard.targets.new_books")} item={overview.monthlyTargets.progress.newBooks} />
            </div>
          </div>

          <form onSubmit={saveTargets} className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">{t("dashboard.targets.title")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Field label={t("dashboard.targets.rentals")} value={form.target_rentals} onChange={(v) => setForm((p) => ({ ...p, target_rentals: v }))} />
              <Field label={t("dashboard.targets.active_readers")} value={form.target_active_readers} onChange={(v) => setForm((p) => ({ ...p, target_active_readers: v }))} />
              <Field label={t("dashboard.targets.on_time_returns")} item={null} value={form.target_on_time_returns} onChange={(v) => setForm((p) => ({ ...p, target_on_time_returns: v }))} />
              <Field label={t("dashboard.targets.new_books")} value={form.target_new_books} onChange={(v) => setForm((p) => ({ ...p, target_new_books: v }))} />
            </div>
            <button type="submit" disabled={updateTargets.isPending} className="px-4 py-2.5 rounded-xl bg-[#142B6F] text-white text-sm font-bold disabled:opacity-50">
              {updateTargets.isPending ? t("dashboard.targets.saving") : t("dashboard.targets.save")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-bold text-[#111111]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[#E1DEE5] text-sm"
      />
    </label>
  );
}
