"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Trash2 } from "lucide-react";

type WishlistItem = {
  id: string;
  book_type: "PHYSICAL" | "DIGITAL";
  bookAvailable: boolean;
  bookDeleted: boolean;
  physical_book?: {
    id: string;
    title: string;
    cover_image_url: string;
    available: number;
    author: { name: string };
    category: { name: string };
  } | null;
  digital_book?: {
    id: string;
    title: string;
    cover_image_url: string;
    pdf_access: string;
    author: { name: string };
    category: { name: string };
  } | null;
};

type Props = {
  wishlist: WishlistItem[];
  loading?: boolean;
  filter: "all" | "physical" | "digital";
  onFilterChange: (filter: "all" | "physical" | "digital") => void;
  onRemove: (itemId: string) => void;
};

export const WishlistGrid = ({ wishlist, loading, filter, onFilterChange, onRemove }: Props) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif font-extrabold text-primary">
            Books You Want to Read
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="aspect-[3/4] rounded-xl bg-muted/50" />
              <div className="h-4 bg-muted/50 rounded" />
              <div className="h-3 bg-muted/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          Books You Want to Read
        </h3>
        <div className="rounded-3xl border border-border/40 bg-card/50 p-12 text-center">
          <p className="text-secondary">
            Your wishlist is empty. Browse books and add them to your wishlist!
          </p>
          <Link
            href="/books"
            className="inline-block mt-4 px-6 py-3 rounded-xl bg-primary text-background text-sm font-bold hover:bg-accent transition-all"
          >
            Browse Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          Books You Want to Read
        </h3>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as "all" | "physical" | "digital")}
            className="appearance-none flex items-center gap-2 px-4 py-2 pr-8 rounded-lg border border-border bg-card text-xs font-bold text-secondary hover:text-primary hover:border-primary transition-all cursor-pointer"
          >
            <option value="all">All Books</option>
            <option value="physical">Physical Only</option>
            <option value="digital">Digital Only</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {wishlist.map((item) => {
          const book = item.physical_book || item.digital_book;
          if (!book) return null;

          const bookId = book.id;
          const isDeleted = item.bookDeleted;
          const isAvailable = item.bookAvailable;

          return (
            <div key={item.id} className="group space-y-3 relative">
              <Link
                href={`/books/${bookId}`}
                className="block"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-1">
                  <Image
                    src={book.cover_image_url || "/auth/image.png"}
                    alt={book.title}
                    fill
                    className="object-cover"
                  />
                  {isDeleted && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">No Longer Available</span>
                    </div>
                  )}
                  {!isDeleted && (
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-md backdrop-blur-sm text-[8px] font-extrabold uppercase tracking-widest ${
                      isAvailable 
                        ? "bg-green-500/90 text-white" 
                        : "bg-orange-500/90 text-white"
                    }`}>
                      {isAvailable ? "Available" : "Unavailable"}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm text-[8px] font-extrabold text-primary uppercase tracking-widest">
                    {item.book_type}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-primary truncate">
                    {book.title}
                  </h4>
                  <p className="text-[10px] text-secondary font-medium truncate">
                    {book.author.name}
                  </p>
                </div>
              </Link>

              <button
                onClick={() => onRemove(item.id)}
                className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                title="Remove from wishlist"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
