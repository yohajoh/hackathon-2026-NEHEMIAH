"use client";

import React from "react";
import Image from "next/image";
import { SectionHeader } from "./SectionHeader";
import { useTrendingBooks } from "@/lib/hooks/useQueries";

type TrendingBook = {
  id: string;
  title: string;
  author?: { name: string };
  cover_image_url?: string;
  category?: { name: string };
  rentalCount?: number;
};

export const MostBorrowed = () => {
  const { data: trendingData, isLoading } = useTrendingBooks();
  
  const books: TrendingBook[] = (trendingData?.data?.trending || []) as TrendingBook[];

  if (isLoading) {
    return (
      <section className="w-full py-20 bg-card/30">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader title="Most Borrowed This Month" viewAllHref="/books" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-3/4 bg-muted/50 rounded-xl" />
                <div className="h-6 bg-muted/50 rounded mt-4" />
                <div className="h-4 bg-muted/50 rounded mt-2 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const displayBooks = books.length > 0 ? books.slice(0, 3) : [
    { id: "1", title: "The Alchemist", category: { name: "Fiction" }, cover_image_url: "/auth/image copy.png" },
    { id: "2", title: "Rich Dad Poor Dad", category: { name: "Finance" }, cover_image_url: "/auth/image copy 2.png" },
    { id: "3", title: "Becoming", category: { name: "Biography" }, cover_image_url: "/auth/image copy 3.png" },
  ];

  return (
    <section className="w-full py-20 bg-card/30">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader title="Most Borrowed This Month" viewAllHref="/books" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {displayBooks.map((book, idx) => (
            <div
              key={book.id}
              className="group relative flex flex-col items-center"
            >
              <div className="absolute top-0 text-[180px] font-serif text-border/40 select-none z-0">
                {idx === 0 ? "ሀ" : idx === 1 ? "ለ" : "ሐ"}
              </div>

              <div className="relative z-10 w-full max-w-[280px] space-y-6 pt-10">
                <div className="relative aspect-3/4 w-full rounded-xl overflow-hidden shadow-lg border-2 border-border/50 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300">
                  <Image
                    src={book.cover_image_url || "/auth/image.png"}
                    alt={book.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-serif font-bold text-primary group-hover:text-secondary transition-colors line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-sm font-medium text-secondary/70">
                    {book.category?.name || book.author?.name || "Popular"}
                  </p>
                </div>

                <button className="w-full rounded-full border border-border bg-background py-3 text-sm font-bold text-primary shadow-sm hover:bg-primary hover:text-background transition-all active:scale-95">
                  Borrow
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
