"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SearchBar } from "@/components/SearchBar";
import { BookCardGrid } from "@/components/BookCardGrid";
import { Pagination } from "@/components/Pagination";
import { useBooks, useDigitalBooks, useCategories, useAuthors } from "@/lib/hooks/useQueries";

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
  rating: { average: number; total: number; distribution?: { 1: number; 2: number; 3: number; 4: number; 5: number } };
  _count?: { rentals?: number; reviews?: number; wishlists?: number };
  type: "physical" | "digital";
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
};

export type Category = { id: string; name: string; slug: string; _count: { books: number; digital_books: number } };
type Author = { id: string; name: string };
type CatalogMode = "all" | "physical" | "digital";

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default function BooksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const selectedCategory = searchParams.get("category") || null;
  const searchQuery = searchParams.get("search") || "";
  const sortBy = searchParams.get("sort") || "title";
  const rawMode = (searchParams.get("mode") || "all") as CatalogMode;
  const mode: CatalogMode = rawMode === "physical" || rawMode === "digital" ? rawMode : "all";
  const selectedAuthor = searchParams.get("author") || "";
  const availabilityRaw = searchParams.get("availability") || "";
  const availability: "" | "true" | "false" =
    availabilityRaw === "true" || availabilityRaw === "false" ? availabilityRaw : "";
  const minRating = searchParams.get("minRating") || "";
  const year = searchParams.get("year") || "";
  const tags = searchParams.get("tags") || "";
  const topics = searchParams.get("topics") || "";
  const limit = 12;

  const updateQuery = useCallback(
    (updates: Record<string, string | null>, resetPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      if (resetPage) next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories("limit=50");
  const { data: authorsData } = useAuthors("limit=50");

  const categories: Category[] = useMemo(
    () =>
      ((categoriesData?.categories || []) as unknown as Category[]).map((cat) => ({
        ...cat,
        _count: {
          books: (cat._count?.books || 0) + (cat._count?.digital_books || 0),
          digital_books: cat._count?.digital_books || 0,
        },
      })),
    [categoriesData],
  );
  const authors: Author[] = useMemo(() => (authorsData?.authors || []) as unknown as Author[], [authorsData]);

  const selectedCategoryId = useMemo(() => {
    if (!selectedCategory) return "";
    const normalized = selectedCategory.trim().toLowerCase();
    const found = categories.find((c) => c.slug.toLowerCase() === normalized || c.name.toLowerCase() === normalized);
    return found?.id || "";
  }, [selectedCategory, categories]);

  const selectedAuthorId = useMemo(() => {
    if (!selectedAuthor) return "";
    const normalized = selectedAuthor.trim().toLowerCase();
    const found = authors.find((a) => a.name.toLowerCase() === normalized);
    return found?.id || "";
  }, [selectedAuthor, authors]);

  const params = useMemo(() => {
    const p = new URLSearchParams({ limit: "24", sort: sortBy });
    if (selectedCategoryId) p.append("category_id", selectedCategoryId);
    if (selectedAuthorId) p.append("author_id", selectedAuthorId);
    if (availability) p.append("available", availability);
    if (minRating) p.append("min_rating", minRating);
    if (year) p.append("year", year);
    if (tags.trim()) p.append("tags", tags.trim());
    if (topics.trim()) p.append("topics", topics.trim());
    if (searchQuery.trim()) p.append("search", searchQuery.trim());
    return p.toString();
  }, [selectedCategoryId, selectedAuthorId, availability, minRating, year, tags, topics, searchQuery, sortBy]);

  const { data: physicalData, isLoading: physicalLoading } = useBooks(params);
  const { data: digitalData, isLoading: digitalLoading } = useDigitalBooks(params);

  const mergedBooks = useMemo(() => {
    const physicalBooks = ((physicalData?.books || []) as unknown as CatalogBook[]).map((b) => ({
      ...b,
      type: "physical" as const,
    }));
    const digitalBooks = ((digitalData?.books || []) as unknown as CatalogBook[]).map((b) => ({
      ...b,
      type: "digital" as const,
    }));

    if (mode === "physical") return physicalBooks;
    if (mode === "digital") return digitalBooks;
    return [...physicalBooks, ...digitalBooks];
  }, [physicalData, digitalData, mode]);

  const booksLoading = physicalLoading || digitalLoading;
  const total = mergedBooks.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageToRender = Math.min(page, totalPages);
  const start = (pageToRender - 1) * limit;
  const books = mergedBooks.slice(start, start + limit);

  useEffect(() => {
    if (page > totalPages) {
      updateQuery({ page: String(totalPages) });
    }
  }, [page, totalPages, updateQuery]);

  const handleCategoryChange = (categorySlug: string | null) => updateQuery({ category: categorySlug }, true);
  const handleSearch = (query: string) => updateQuery({ search: query.trim() || null }, true);
  const handleSortChange = (sort: string) => updateQuery({ sort }, true);

  const startIndex = total === 0 ? 0 : (pageToRender - 1) * limit + 1;
  const endIndex = Math.min(pageToRender * limit, total);
  const preservedQuery = searchParams.toString();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />
      <main className="grow mx-auto max-w-7xl w-full px-6 py-12">
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
                  className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary"
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
                  onClick={() => updateQuery({ mode: item }, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === item ? "bg-primary text-background" : "bg-muted/50 text-secondary hover:text-primary"}`}
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
                    ? `Showing ${startIndex}-${endIndex} of ${total} ${mode === "all" ? "" : mode + " "}books`
                    : "No books found"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <select
                value={selectedAuthor}
                onChange={(e) => updateQuery({ author: e.target.value || null }, true)}
                className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
              >
                <option value="">All Authors</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                value={availability}
                onChange={(e) => updateQuery({ availability: e.target.value || null }, true)}
                className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
              >
                <option value="">Availability</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
              <input
                type="number"
                min={1}
                max={5}
                step="0.1"
                value={minRating}
                onChange={(e) => updateQuery({ minRating: e.target.value || null }, true)}
                placeholder="Min rating (e.g. 4)"
                className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
              />
              <input
                type="number"
                value={year}
                onChange={(e) => updateQuery({ year: e.target.value || null }, true)}
                placeholder="Publication year"
                className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => updateQuery({ tags: e.target.value || null }, true)}
                placeholder="Tags (comma separated)"
                className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
              />
              <input
                type="text"
                value={topics}
                onChange={(e) => updateQuery({ topics: e.target.value || null }, true)}
                placeholder="Topics (comma separated)"
                className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
              />
            </div>
            <BookCardGrid books={books} loading={booksLoading} listQuery={preservedQuery} />
            {totalPages > 1 && (
              <Pagination
                currentPage={pageToRender}
                totalPages={totalPages}
                onPageChange={(nextPage) => updateQuery({ page: String(nextPage) })}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
