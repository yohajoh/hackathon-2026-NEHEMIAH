"use client";

import React from "react";
import type { Rental, SystemConfig } from "@/lib/hooks/useQueries";

type Props = {
  rental: Rental | null;
  totalOwed: number;
  config: SystemConfig | null;
  loading?: boolean;
};

const daysBetween = (start: string, end: string) =>
  Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );

export const AmountOwed = ({ rental, totalOwed, config, loading }: Props) => {
  if (loading) {
    return (
      <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm space-y-4 animate-pulse h-full">
        <div className="h-6 bg-muted/50 rounded w-1/2" />
        <div className="h-12 bg-muted/50 rounded" />
        <div className="h-12 bg-muted/50 rounded" />
      </div>
    );
  }

  const dailyFine = config ? Number(config.daily_fine) : 0;
  const daysBorrowed = rental && rental.loan_date
    ? daysBetween(rental.loan_date, rental.return_date || new Date().toISOString())
    : 0;

  return (
    <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm space-y-8 h-full">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        Amount Owed
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/20">
          <span className="text-sm font-medium text-secondary">
            Daily Fine (if overdue):
          </span>
          <span className="text-sm font-bold text-primary">
            {dailyFine.toFixed(1)} birr per day
          </span>
        </div>

        {rental && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/20">
            <span className="text-sm font-medium text-secondary">
              Days Borrowed So Far:
            </span>
            <span className="text-sm font-bold text-primary">{daysBorrowed} days</span>
          </div>
        )}

        <div className="pt-4 border-t border-dashed border-border flex items-center justify-between">
          <span className="text-sm font-bold text-primary uppercase tracking-wider">
            Total Amount Owed:
          </span>
          <div className="text-2xl font-serif font-extrabold text-primary">
            {totalOwed.toFixed(1)} birr
          </div>
        </div>
      </div>
    </div>
  );
};
