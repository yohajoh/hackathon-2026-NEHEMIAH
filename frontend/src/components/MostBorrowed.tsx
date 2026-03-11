"use client";

import Image from "next/image";
import { SectionHeader } from "./SectionHeader";
import { useTrendingBooks } from "@/lib/hooks/useQueries";

export const MostBorrowed = () => {
  const { data: trendingData, isLoading } = useTrendingBooks();

  const books =
    (
      trendingData?.data as unknown as {
        trending?: Array<{
          book: { title: string; cover_image_url?: string; author?: { name?: string } };
          rentalCount?: number;
        }>;
      }
    )?.trending || [];

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

  return (
    <section className="w-full py-20 bg-card/30 mb-15">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader title="Most Borrowed This Month" viewAllHref="/books" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {books.map((book, idx) => (
            <div key={idx} className="group relative flex flex-col items-center">
              <div className="absolute top-0 text-[180px] font-serif text-border/40 select-none z-0">
                {idx === 0 ? "ሀ" : idx === 1 ? "ለ" : "ሐ"}
              </div>

              <div className="relative z-10 w-full max-w-50 space-y-6 pt-10">
                <div className="relative aspect-3/4 w-full rounded-xl overflow-hidden shadow-lg border-2 border-border/50 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300">
                  <Image
                    src={book.book.cover_image_url || "/auth/image.png"}
                    alt={book.book.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-primary group-hover:text-secondary transition-colors line-clamp-1 mb-1">
                      {book.book.title}
                    </h3>
                    <p className="text-sm font-medium text-secondary/70">by: {book.book.author.name}</p>
                  </div>
                  <div>Borrowed: {book.rentalCount} times</div>
                </div>

                <button className="w-full rounded-full border border-border bg-background py-2.5 text-sm font-bold text-primary shadow-sm hover:bg-primary hover:text-background transition-all active:scale-95 cursor-pointer">
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
