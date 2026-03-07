"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Book as BookIcon } from "lucide-react";

type Book = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pages: number;
  copies: number;
  available: number;
  author: { id: string; name: string; image: string | null };
  category: { id: string; name: string; slug: string };
  rating: {
    average: number;
    total: number;
  };
  type?: "physical" | "digital";
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
};

type Props = {
  books: Book[];
  loading?: boolean;
};

export const BookCardGrid = ({ books, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="space-y-3 animate-pulse">
            <div className="aspect-[3/4] rounded-2xl bg-muted/50" />
            <div className="h-4 bg-muted/50 rounded" />
            <div className="h-3 bg-muted/50 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="col-span-full text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
          <BookIcon size={40} className="text-secondary/40" />
        </div>
        <h3 className="text-xl font-serif font-bold text-primary mb-2">
          No books found
        </h3>
        <p className="text-secondary">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
      {books.map((book) => (
        <div key={book.id} className="group flex flex-col items-center">
          {/* Cover Image Container */}
          <Link
            href={book.type === "digital" ? `/books/${book.id}?type=digital` : `/books/${book.id}`}
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 border border-border/40"
          >
            <Image
              src={book.cover_image_url || "/auth/image.png"}
              alt={book.title}
              fill
              className="object-cover"
            />

            {/* Availability Badge */}
            {book.type === "digital" ? (
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm bg-[#8B6B4A]/90 text-white">
                <BookIcon size={10} />
                {book.pdf_access === "RESTRICTED" ? "Read Only" : "Download"}
              </div>
            ) : (
              <div
                className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm ${
                  book.available > 0
                    ? "bg-green-500/90 text-white"
                    : "bg-red-500/90 text-white"
                }`}
              >
                <BookIcon size={10} />
                {book.available > 0 ? `${book.available} left` : "Unavailable"}
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-background text-primary px-4 py-2 rounded-full text-xs font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                View Details
              </span>
            </div>
          </Link>

          {/* Book Info */}
          <div className="mt-4 w-full space-y-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <Link href={book.type === "digital" ? `/books/${book.id}?type=digital` : `/books/${book.id}`}>
                <h3 className="text-sm font-serif font-bold text-primary group-hover:text-secondary transition-colors line-clamp-1">
                  {book.title}
                </h3>
              </Link>
              {book.rating.total > 0 && (
                <div className="flex items-center gap-1 text-[#E58A00]">
                  <Star size={12} fill="currentColor" />
                  <span className="text-[10px] font-bold">
                    {book.rating.average.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] font-medium text-secondary/70 line-clamp-1">
              {book.author.name}
            </p>
            <p className="text-[10px] font-medium text-secondary/50">
              {book.category.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
