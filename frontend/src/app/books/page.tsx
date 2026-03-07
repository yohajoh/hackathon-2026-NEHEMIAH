"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SearchBar } from "@/components/SearchBar";
import { BookCardGrid } from "@/components/BookCardGrid";
import { Pagination } from "@/components/Pagination";
import { fetchApi } from "@/lib/api";

export type CatalogBook = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pages: number;
  copies: number;
  available: number;
  author: { id: string; name: string; image?: string | null };
  category: { id: string; name: string; slug: string };
  rating: {
    average: number;
    total: number;
    distribution?: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
  _count?: { rentals?: number; reviews?: number; wishlists?: number };
  type: "physical" | "digital";
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { books: number; digital_books: number };
};

type CatalogMode = "all" | "physical" | "digital";

export default function BooksPage() {
  const [books, setBooks] = useState<CatalogBook[]>([]);
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
  const [mode, setMode] = useState<CatalogMode>("all");
  const limit = 12;

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        const response = await fetchApi("/categories?limit=100");
        if (response && Array.isArray(response.categories)) {
          setCategories(response.categories);
        }
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadBooks() {
      try {
        setBooksLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sort: sortBy,
        });

        if (selectedCategory) params.append("category_id", selectedCategory);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());

        if (mode === "physical") {
          const response = await fetchApi(`/books?${params.toString()}`);
          const mapped = (response?.books || []).map((b: CatalogBook) => ({ ...b, type: "physical" as const }));
          setBooks(mapped);
          setTotalPages(response?.meta?.totalPages || 1);
          setTotal(response?.meta?.total || mapped.length);
          return;
        }

        if (mode === "digital") {
          const response = await fetchApi(`/digital-books?${params.toString()}`);
          const mapped = (response?.books || []).map((b: CatalogBook) => ({ ...b, type: "digital" as const }));
          setBooks(mapped);
          setTotalPages(response?.meta?.totalPages || 1);
          setTotal(response?.meta?.total || mapped.length);
          return;
        }

        const allParams = new URLSearchParams({ limit: "100", sort: sortBy });
        if (selectedCategory) allParams.append("category_id", selectedCategory);
        if (searchQuery.trim()) allParams.append("search", searchQuery.trim());

        const [physicalRes, digitalRes] = await Promise.all([
          fetchApi(`/books?${allParams.toString()}`),
          fetchApi(`/digital-books?${allParams.toString()}`),
        ]);

        const merged = [
          ...(physicalRes?.books || []).map((b: CatalogBook) => ({ ...b, type: "physical" as const })),
          ...(digitalRes?.books || []).map((b: CatalogBook) => ({ ...b, type: "digital" as const })),
        ];

        const start = (page - 1) * limit;
        const end = start + limit;
        setBooks(merged.slice(start, end));
        setTotal(merged.length);
        setTotalPages(Math.max(1, Math.ceil(merged.length / limit)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load books");
      } finally {
        setBooksLoading(false);
      }
    }
    loadBooks();
  }, [page, selectedCategory, searchQuery, sortBy, mode]);

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(1);
  };

  const modeLabel = useMemo(
    () => (mode === "all" ? "All" : mode === "physical" ? "Physical" : "Digital"),
    [mode],
  );

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="grow mx-auto max-w-7xl w-full px-6 py-12">
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 mb-6">{error}</div>
        )}

        <div className="flex flex-col lg:flex-row gap-12">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            loading={categoriesLoading}
          />

          <div className="flex-1 space-y-10">
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

            <div className="flex items-center gap-2 border-b border-border/50 pb-4">
              {(["all", "physical", "digital"] as CatalogMode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setMode(item);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === item ? "bg-primary text-background" : "bg-muted/50 text-secondary hover:text-primary"
                  }`}
                >
                  {item === "all" ? "All" : item === "physical" ? "Physical" : "Digital"}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <p className="text-sm text-secondary font-medium">
                {booksLoading
                  ? "Loading..."
                  : total > 0
                  ? `Showing ${startIndex}-${endIndex} of ${total} ${modeLabel.toLowerCase()} books`
                  : "No books found"}
              </p>
            </div>

            <BookCardGrid books={books} loading={booksLoading} />

            {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
