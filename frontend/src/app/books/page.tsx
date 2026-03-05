"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SearchBar } from "@/components/SearchBar";
import { BookCardGrid } from "@/components/BookCardGrid";
import { Pagination } from "@/components/Pagination";

export default function BooksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="grow mx-auto max-w-7xl w-full px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <CategorySidebar />

          {/* Main Content */}
          <div className="flex-1 space-y-10">
            {/* Top Bar: Search and Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <SearchBar />
              <div className="flex items-center gap-2 text-sm font-bold text-secondary">
                <span className="text-primary">Sort by:</span>
                <select className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary transition-colors">
                  <option>Popularity</option>
                  <option>Newest</option>
                  <option>Rating</option>
                </select>
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <p className="text-sm text-secondary font-medium">
                Showing <span className="text-primary font-bold">1-10</span> of{" "}
                <span className="text-primary font-bold">247</span> books
              </p>
            </div>

            {/* Book Grid */}
            <BookCardGrid />

            {/* Pagination */}
            <Pagination />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
