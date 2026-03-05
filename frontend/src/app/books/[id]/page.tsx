"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Star,
  ChevronRight,
  Book as BookIcon,
  Headphones,
  Info,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const books = [
  {
    id: 1,
    title: "የብርሃን እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.5,
    type: "Hardcover",
    image: "/auth/image copy.png",
    category: "Spiritual",
    pages: 243,
    overview:
      '"የብርሃን እናት" (Mother of Light) by Deacon Henok Haile is a profound Ethiopian Orthodox Christian book written in Amharic, dedicated to the Virgin Mary, the Mother of our Lord and Savior Jesus Christ. This inspiring work explores the spiritual significance, faith, and devotion to St. Mary within the Ethiopian Orthodox Tewahedo tradition.',
    highlights: [
      "Written in Amharic for Ethiopian readers and the Orthodox faithful worldwide.",
      "Explains the role of St. Mary (Kidist Mariam) as the Mother of Light and intercessor.",
      "Rich in spiritual reflections, Biblical references, and Orthodox teachings.",
      "Perfect for personal devotion, church study groups, and family reading.",
      "A valuable resource for those seeking to strengthen their faith and grow closer to God through the intercession of the Virgin Mary.",
    ],
  },
  {
    id: 2,
    title: "የንስሐ እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 3.5,
    type: "Audio",
    image: "/auth/image copy 2.png",
    category: "Spiritual",
    pages: 180,
    overview: "Placeholder overview for የንስሐ እናት...",
    highlights: ["Highlight 1", "Highlight 2"],
  },
  {
    id: 3,
    title: "የበረከት እናት",
    author: "ዲያቆን ሄኖክ ኃይሌ",
    rating: 4.8,
    type: "Hardcover",
    image: "/auth/image copy 3.png",
    category: "Spiritual",
    pages: 310,
    overview: "Placeholder overview for የበረከት እናት...",
    highlights: ["Highlight 1", "Highlight 2"],
  },
];

export default function BookDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const book = books.find((b) => b.id === id) || books[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="grow mx-auto max-w-7xl w-full px-6 py-8 lg:py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-bold text-secondary/60 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/books" className="hover:text-primary transition-colors">
            Books
          </Link>
          <ChevronRight size={14} />
          <span className="text-secondary">{book.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left: Book Cover */}
          <div className="lg:w-1/3 xl:w-1/4">
            <div className="relative aspect-3/4 w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform -rotate-1 hover:rotate-0 transition-transform duration-500">
              <Image
                src={book.image}
                alt={book.title}
                fill
                priority
                className="object-cover"
              />
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-primary/90 text-xs font-bold text-background flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                {book.type === "Audio" ? (
                  <Headphones size={14} />
                ) : (
                  <BookIcon size={14} />
                )}
                {book.type}
              </div>
            </div>
          </div>

          {/* Right: Book Info */}
          <div className="flex-1 space-y-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary leading-tight">
                  {book.title}
                </h1>
                <p className="text-lg text-secondary font-medium">
                  by{" "}
                  <span className="text-primary font-bold">{book.author}</span>
                </p>
              </div>
              <button className="w-full md:w-auto rounded-full bg-primary px-10 py-4 text-base font-bold text-background shadow-xl hover:bg-accent transition-all active:scale-95">
                Request to borrow
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Rating
                </p>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm font-bold">{book.rating}</span>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Category
                </p>
                <p className="text-sm font-bold text-primary">
                  {book.category}
                </p>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Pages
                </p>
                <p className="text-sm font-bold text-primary">{book.pages}</p>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                  <Info size={24} className="text-secondary" />
                  Overview
                </h2>
                <div className="prose prose-stone max-w-none text-secondary leading-relaxed font-medium">
                  <p>{book.overview}</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-serif font-bold text-primary">
                  Highlights of the Book:
                </h2>
                <ul className="space-y-4">
                  {book.highlights.map((highlight, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-secondary font-medium leading-relaxed"
                    >
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
