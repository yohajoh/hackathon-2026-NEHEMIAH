"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const historyData = [
  {
    id: 1,
    title: "የብርሃን እናት",
    borrowedDate: "Jan 10, 2026",
    returnedDate: "Jan 24, 2026",
    daysKept: "14 days",
    amountPaid: "28 birr",
  },
  {
    id: 2,
    title: "የንስሐ እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Dec 12, 2025",
    daysKept: "11 days",
    amountPaid: "22 birr",
  },
];

export const BorrowingHistoryTable = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          Borrowing History
        </h3>
        <Link
          href="/dashboard/history"
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
            {historyData.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-primary/[0.02] transition-colors"
              >
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
      </div>
    </div>
  );
};
