"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SearchBar } from "@/components/SearchBar";
import { BookCardGrid } from "@/components/BookCardGrid";
import { Pagination } from "@/components/Pagination";
import { fetchApi } from "@/lib/api";

export type Book = {
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
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
  _count: { rentals: number; reviews: number; wishlists: number };
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { books: number; digital_books: number };
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const limit = 12;

  // Load categories only once on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        const response = await fetchApi("/categories?limit=100");
        if (response && Array.isArray(response.categories)) {
          setCategories(response.categories);
        }
      } catch (e) {
        console.error("Failed to load categories:", e);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []); // Empty dependency array - runs only once

  // Load books whenever filters change
  useEffect(() => {
    async function loadBooks() {
      try {
        setBooksLoading(true);
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sort: sortBy,
        });

        if (selectedCategory) {
          queryParams.append("category_id", selectedCategory);
        }

        if (searchQuery.trim()) {
          queryParams.append("search", searchQuery.trim());
        }

        const response = await fetchApi(`/books?${queryParams.toString()}`);

        if (response && Array.isArray(response.books)) {
          setBooks(response.books);
          if (response.meta) {
            setTotalPages(response.meta.totalPages || 1);
            setTotal(response.meta.total || 0);
          }
        }
      } catch (e) {
        console.error("Failed to load books:", e);
        setError(e instanceof Error ? e.message : "Failed to load books");
      } finally {
        setBooksLoading(false);
      }
    }
    loadBooks();
  }, [page, selectedCategory, searchQuery, sortBy]);

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setPage(1); // Reset to first page
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(1); // Reset to first page
  };

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="grow mx-auto max-w-7xl w-full px-6 py-12">
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            loading={categoriesLoading}
          />

          {/* Main Content */}
          <div className="flex-1 space-y-10">
            {/* Top Bar: Search and Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <SearchBar onSearch={handleSearch} />
              <div className="flex items-center gap-2 text-sm font-bold text-secondary">
                <span className="text-primary">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary transition-colors"
                >
                  <option value="title">Title (A-Z)</option>
                  <option value="-title">Title (Z-A)</option>
                  <option value="-available">Most Available</option>
                  <option value="available">Least Available</option>
                  <option value="pages">Shortest</option>
                  <option value="-pages">Longest</option>
                </select>
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <p className="text-sm text-secondary font-medium">
                {booksLoading ? (
                  "Loading..."
                ) : total > 0 ? (
                  <>
                    Showing <span className="text-primary font-bold">{startIndex}-{endIndex}</span> of{" "}
                    <span className="text-primary font-bold">{total}</span> books
                  </>
                ) : (
                  "No books found"
                )}
              </p>
            </div>

            {/* Book Grid */}
            <BookCardGrid books={books} loading={booksLoading} />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
