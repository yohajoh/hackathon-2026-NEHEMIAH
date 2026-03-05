"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ChevronDown } from "lucide-react";

const wishlistBooks = [
  {
    id: 1,
    title: "የብርሃን እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.5,
    type: "Hardcover",
  },
  {
    id: 2,
    title: "የንስሐ እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.8,
    type: "Hardcover",
  },
  {
    id: 3,
    title: "የበረከት እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.2,
    type: "Hardcover",
  },
  {
    id: 4,
    title: "የጽናት እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.6,
    type: "Audio",
  },
  {
    id: 5,
    title: "የክብር እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.9,
    type: "Hardcover",
  },
];

export const WishlistGrid = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          Books You Want to Read
        </h3>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-secondary hover:text-primary hover:border-primary transition-all">
          All
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {wishlistBooks.map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.id}`}
            className="group space-y-3"
          >
            {/* Book Cover */}
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-1">
              <Image
                src="/auth/image.png"
                alt={book.title}
                fill
                className="object-cover"
              />
              <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm text-[8px] font-extrabold text-primary uppercase tracking-widest">
                {book.type}
              </div>
            </div>

            {/* Book Info */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-primary truncate">
                  {book.title}
                </h4>
                <div className="flex items-center gap-0.5 text-primary shrink-0">
                  <Star size={10} fill="currentColor" />
                  <span className="text-[10px] font-bold">{book.rating}</span>
                </div>
              </div>
              <p className="text-[10px] text-secondary font-medium truncate">
                {book.author}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
