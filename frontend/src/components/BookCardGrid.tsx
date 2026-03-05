"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Headphones, Book as BookIcon } from "lucide-react";

interface Book {
  id: number;
  title: string;
  author: string;
  rating: number;
  type: "Hardcover" | "Audio";
  image: string;
}

const books: Book[] = [
  {
    id: 1,
    title: "የብርሃን እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.5,
    type: "Hardcover",
    image: "/auth/image copy.png",
  },
  {
    id: 2,
    title: "የንስሐ እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 3.5,
    type: "Audio",
    image: "/auth/image copy 2.png",
  },
  {
    id: 3,
    title: "የበረከት እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.8,
    type: "Hardcover",
    image: "/auth/image copy 3.png",
  },
  {
    id: 4,
    title: "የጽናት እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.2,
    type: "Hardcover",
    image: "/auth/image copy 4.png",
  },
  {
    id: 5,
    title: "የክብር እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.9,
    type: "Audio",
    image: "/auth/image copy 5.png",
  },
  {
    id: 6,
    title: "የወንጌል እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.0,
    type: "Hardcover",
    image: "/auth/image.png",
  },
  {
    id: 7,
    title: "የተስፋ እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.3,
    type: "Hardcover",
    image: "/auth/image copy 2.png",
  },
  {
    id: 8,
    title: "የፍቅር እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.7,
    type: "Audio",
    image: "/auth/image copy 3.png",
  },
  {
    id: 9,
    title: "የሰላም እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.6,
    type: "Hardcover",
    image: "/auth/image copy.png",
  },
  {
    id: 10,
    title: "የደስታ እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.1,
    type: "Hardcover",
    image: "/auth/image copy 4.png",
  },
];

export const BookCardGrid = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
      {books.map((book) => (
        <div key={book.id} className="group flex flex-col items-center">
          {/* Cover Image Container */}
          <Link
            href={`/books/${book.id}`}
            className="relative aspect-3/4 w-full rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 border border-border/40"
          >
            <Image
              src={book.image}
              alt={book.title}
              fill
              className="object-cover"
            />
            {/* Type Label Overlay */}
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-primary/90 text-[10px] font-bold text-background flex items-center gap-1 backdrop-blur-sm">
              {book.type === "Audio" ? (
                <Headphones size={10} />
              ) : (
                <BookIcon size={10} />
              )}
              {book.type}
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-background text-primary px-4 py-2 rounded-full text-xs font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                Quick View
              </span>
            </div>
          </Link>

          {/* Book Info */}
          <div className="mt-4 w-full space-y-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <Link href={`/books/${book.id}`}>
                <h3 className="text-sm font-serif font-bold text-primary group-hover:text-secondary transition-colors line-clamp-1">
                  {book.title}
                </h3>
              </Link>
              <div className="flex items-center gap-1 text-primary">
                <Star size={12} fill="currentColor" />
                <span className="text-[10px] font-bold">{book.rating}</span>
              </div>
            </div>
            <p className="text-[11px] font-medium text-secondary/70 line-clamp-1">
              {book.author}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
