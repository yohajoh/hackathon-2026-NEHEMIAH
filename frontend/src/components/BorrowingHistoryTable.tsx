"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RentalItem } from "@/app/dashboard/page";

type Props = {
  rentals: RentalItem[];
  loading?: boolean;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const daysBetween = (start: string, end: string) =>
  Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );

export const BorrowingHistoryTable = ({ rentals, loading }: Props) => {
  const rows = rentals.map((r) => {
    const returned = r.return_date ? formatDate(r.return_date) : "—";
    const days =
      r.return_date
        ? daysBetween(r.loan_date, r.return_date)
        : 0;
    const amount = r.payment?.amount ?? r.fine ?? 0;
    return {
      id: r.id,
      title: r.physical_book.title,
      borrowedDate: formatDate(r.loan_date),
      returnedDate: returned,
      daysKept: r.return_date ? `${days} days` : "—",
      amountPaid: amount > 0 ? `${Number(amount).toFixed(1)} birr` : "0 birr",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          Borrowing History
        </h3>
        <Link
          href="/dashboard/student/history"
          className="flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary transition-colors group"
        >
          See all
          <ChevronRight
            size={16}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
        {loading ? (
          <div className="p-8 animate-pulse">
            <div className="h-8 bg-muted/50 rounded mb-4 w-2/3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-secondary">
            No borrowing history yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                  Title
                </th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                  Borrowed Date
                </th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                  Returned Date
                </th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                  Days Kept
                </th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                  Amount Paid
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/20">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-5 font-bold text-primary">
                    {row.title}
                  </td>
                  <td className="px-6 py-5 text-secondary font-medium">
                    {row.borrowedDate}
                  </td>
                  <td className="px-6 py-5 text-secondary font-medium">
                    {row.returnedDate}
                  </td>
                  <td className="px-6 py-5 text-secondary font-medium">
                    {row.daysKept}
                  </td>
                  <td className="px-6 py-5 font-extrabold text-primary">
                    {row.amountPaid}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
