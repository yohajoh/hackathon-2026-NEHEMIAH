"use client";

import React from "react";
import Image from "next/image";
import type { Rental } from "@/lib/hooks/useQueries";

type Props = {
  rental: Rental | null;
  dailyFine?: number;
  loading?: boolean;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const CurrentlyBorrowed = ({ rental, loading }: Props) => {
  if (loading) {
    return (
      <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm animate-pulse">
        <div className="h-48 bg-muted/50 rounded-2xl" />
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm text-center">
        <p className="text-secondary font-medium">You have no borrowed books.</p>
        <p className="text-sm text-secondary/70 mt-2">Visit the Books page to borrow a book.</p>
      </div>
    );
  }

  const book = rental.physical_book;
  const loanDate = rental.loan_date ? formatDate(rental.loan_date) : "—";
  const dueDate = rental.due_date ? formatDate(rental.due_date) : "—";
  const daysLeft = rental.daysUntilDue ?? 0;
  const isOverdue = rental.isOverdue ?? false;
  const daysOverdue = rental.daysOverdue ?? 0;
  const bookTitle = book?.title || rental.book?.title || "Unknown Book";
  const bookCover = book?.cover_image_url || rental.book?.cover_image || "/auth/image.png";

  return (
    <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

      <div className="relative flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-40 shrink-0">
          <div className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-xl border-4 border-white/50">
            <Image
              src={bookCover}
              alt={bookTitle}
              fill
              sizes="(max-width: 768px) 100vw, 160px"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-serif font-extrabold text-primary">{bookTitle}</h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="bg-muted/50 rounded-xl px-4 py-2 space-y-0.5 border border-border/30">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Borrowed on</p>
                <p className="text-sm font-bold text-primary">{loanDate}</p>
              </div>
              <div className="bg-muted/50 rounded-xl px-4 py-2 space-y-0.5 border border-border/30">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Due date</p>
                <p className="text-sm font-bold text-primary">{dueDate}</p>
              </div>
              <div
                className={
                  isOverdue
                    ? "bg-red-50 rounded-xl px-4 py-2 space-y-0.5 border border-red-100"
                    : "bg-orange-50 rounded-xl px-4 py-2 space-y-0.5 border border-orange-100"
                }
              >
                <p
                  className={
                    isOverdue
                      ? "text-[10px] uppercase tracking-widest text-red-600 font-bold"
                      : "text-[10px] uppercase tracking-widest text-orange-600 font-bold"
                  }
                >
                  {isOverdue ? "Days overdue" : "Days remaining"}
                </p>
                <p className={isOverdue ? "text-sm font-bold text-red-700" : "text-sm font-bold text-orange-700"}>
                  {isOverdue ? `${daysOverdue} days` : `${daysLeft} days left`}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-secondary">Return this book to a librarian to complete the return.</p>
        </div>
      </div>
    </div>
  );
};
