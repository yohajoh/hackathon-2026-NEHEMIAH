"use client";

import React from "react";
import Image from "next/image";
import { SectionHeader } from "./SectionHeader";

const books = [
  {
    id: 1,
    title: "The Alchemist",
    category: "Fiction",
    image: "/auth/image copy.png",
  },
  {
    id: 2,
    title: "Rich Dad Poor Dad",
    category: "Finance",
    image: "/auth/image copy 2.png",
  },
  {
    id: 3,
    title: "Becoming",
    category: "Biography",
    image: "/auth/image copy 3.png",
  },
];

export const MostBorrowed = () => {
  return (
    <section className="w-full py-20 bg-card/30">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader title="Most Borrowed This Month" viewAllHref="/books" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {books.map((book) => (
            <div
              key={book.id}
              className="group relative flex flex-col items-center"
            >
              {/* Decorative background character */}
              <div className="absolute top-0 text-[180px] font-serif text-border/40 select-none z-0">
                {book.id === 1 ? "ሀ" : book.id === 2 ? "ለ" : "ሐ"}
              </div>

              {/* Card Container */}
              <div className="relative z-10 w-full max-w-[280px] space-y-6 pt-10">
                <div className="relative aspect-3/4 w-full rounded-xl overflow-hidden shadow-lg border-2 border-border/50 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300">
                  <Image
                    src={book.image}
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
                    {book.category}
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
