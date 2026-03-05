"use client";

import { BookOpen, Wallet, Calculator, Calendar } from "lucide-react";

type RentalItem = {
  id: string;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  fine: number | null;
  payment?: { amount: number; status: string } | null;
};

type SystemConfig = {
  daily_fine: string | number;
  max_loan_days: number;
};

type Props = {
  rentals: RentalItem[];
  config: SystemConfig | null;
  loading?: boolean;
};

const daysBetween = (start: string, end: string) =>
  Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

export const HistorySummary = ({ rentals, config, loading }: Props) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-serif font-extrabold text-primary">
          Summary Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm animate-pulse"
            >
              <div className="h-20 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalBorrowed = rentals.length;
  
  // Total amount paid (from payments + fines)
  const totalPaid = rentals.reduce((sum, r) => {
    const paymentAmount = r.payment?.amount ? Number(r.payment.amount) : 0;
    const fineAmount = r.fine ? Number(r.fine) : 0;
    return sum + Math.max(paymentAmount, fineAmount);
  }, 0);
  
  // Average cost per book
  const avgCost = totalBorrowed > 0 ? totalPaid / totalBorrowed : 0;
  
  // Total days of reading (sum of all rental periods)
  const totalDays = rentals.reduce((sum, r) => {
    if (r.return_date) {
      return sum + daysBetween(r.loan_date, r.return_date);
    } else if (r.status === "BORROWED") {
      return sum + daysBetween(r.loan_date, new Date().toISOString());
    }
    return sum;
  }, 0);

  const stats = [
    {
      label: "Total Books Borrowed",
      value: totalBorrowed.toString(),
      icon: <BookOpen className="text-secondary" size={24} />,
    },
    {
      label: "Total Amount Paid",
      value: `${totalPaid.toFixed(1)} birr`,
      icon: <Wallet className="text-secondary" size={24} />,
    },
    {
      label: "Average Cost Per Book",
      value: `${avgCost.toFixed(1)} birr`,
      icon: <Calculator className="text-secondary" size={24} />,
    },
    {
      label: "Total Days of Reading",
      value: `${totalDays} days`,
      icon: <Calendar className="text-secondary" size={24} />,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-extrabold text-primary">
        Summary Stats
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">{stat.icon}</div>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                {stat.label}
              </p>
            </div>
            <p className="text-3xl font-serif font-extrabold text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
