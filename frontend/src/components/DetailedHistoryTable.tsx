"use client";

import Link from "next/link";

type RentalItem = {
  id: string;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  status: "BORROWED" | "PENDING" | "RETURNED" | "COMPLETED";
  fine: number | null;
  physical_book: { id: string; title: string; cover_image_url: string; pages: number };
  payment?: { amount: number; status: string } | null;
};

type SystemConfig = {
  daily_fine: string | number;
};

type Props = {
  rentals: RentalItem[];
  config: SystemConfig | null;
  loading?: boolean;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const daysBetween = (start: string, end: string) =>
  Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "BORROWED":
      return { text: "Currently Borrowed", color: "bg-amber-100 text-amber-700" };
    case "PENDING":
      return { text: "Pending Payment", color: "bg-orange-100 text-orange-700" };
    case "RETURNED":
      return { text: "Returned", color: "bg-green-100 text-green-700" };
    case "COMPLETED":
      return { text: "Completed", color: "bg-blue-100 text-blue-700" };
    default:
      return { text: status, color: "bg-gray-100 text-gray-700" };
  }
};

export const DetailedHistoryTable = ({ rentals, config, loading }: Props) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          Borrowing History
        </h3>
        <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
          <div className="p-8 animate-pulse">
            <div className="h-8 bg-muted/50 rounded mb-4 w-2/3" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          Borrowing History
        </h3>
        <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
          <div className="p-8 text-center text-secondary">
            No borrowing history yet. Visit the Books page to borrow your first book!
          </div>
        </div>
      </div>
    );
  }

  const rows = rentals.map((r) => {
    const returned = r.return_date ? formatDate(r.return_date) : "---";
    const days = r.return_date
      ? daysBetween(r.loan_date, r.return_date)
      : r.status === "BORROWED"
      ? daysBetween(r.loan_date, new Date().toISOString())
      : 0;
    
    // Amount paid is either from payment or fine
    const amount = r.payment?.amount ?? r.fine ?? 0;
    const statusDisplay = getStatusDisplay(r.status);

    return {
      id: r.id,
      bookId: r.physical_book.id,
      title: r.physical_book.title,
      borrowedDate: formatDate(r.loan_date),
      returnedDate: returned,
      daysKept: days > 0 ? `${days} days` : "---",
      amountPaid: amount > 0 ? `${Number(amount).toFixed(1)} birr` : "0 birr",
      status: statusDisplay.text,
      statusColor: statusDisplay.color,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          Borrowing History
        </h3>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
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
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Status
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border/20">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-primary/2 transition-colors">
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
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.statusColor}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link
                    href={`/books/${row.bookId}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border bg-card text-[11px] font-bold text-secondary hover:text-primary hover:border-primary transition-all whitespace-nowrap"
                  >
                    See Book Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
