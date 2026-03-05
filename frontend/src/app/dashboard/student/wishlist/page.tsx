"use client";

import { useEffect, useState } from "react";
import { WishlistSummary } from "@/components/WishlistSummary";
import { WishlistGrid } from "@/components/WishlistGrid";
import { Pagination } from "@/components/Pagination";
import { fetchApi } from "@/lib/api";

export type WishlistItem = {
  id: string;
  book_type: "PHYSICAL" | "DIGITAL";
  created_at: string;
  bookAvailable: boolean;
  bookDeleted: boolean;
  physical_book?: {
    id: string;
    title: string;
    cover_image_url: string;
    available: number;
    copies: number;
    pages: number;
    deleted_at: string | null;
    author: { id: string; name: string };
    category: { id: string; name: string };
  } | null;
  digital_book?: {
    id: string;
    title: string;
    cover_image_url: string;
    pdf_access: string;
    pages: number;
    deleted_at: string | null;
    author: { id: string; name: string };
    category: { id: string; name: string };
  } | null;
};

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "physical" | "digital">("all");
  const limit = 12;

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (filter !== "all") {
        queryParams.append("book_type", filter);
      }

      const response = await fetchApi(`/wishlist?${queryParams.toString()}`);
      
      if (response && Array.isArray(response.wishlist)) {
        setWishlist(response.wishlist);
        if (response.meta) {
          setTotalPages(response.meta.totalPages || 1);
        }
      }
    } catch (e) {
      console.error("Wishlist load error:", e);
      setError(e instanceof Error ? e.message : "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, [page, filter]);

  const handleRemove = async (itemId: string) => {
    try {
      await fetchApi(`/wishlist/${itemId}`, { method: "DELETE" });
      loadWishlist();
    } catch (e) {
      console.error("Remove error:", e);
      alert(e instanceof Error ? e.message : "Failed to remove item");
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
          My Wishlist
        </h1>
        <p className="text-secondary font-medium">
          Books you want to read. We&apos;ll notify you when they&apos;re available.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <WishlistSummary wishlist={wishlist} loading={loading} />

      <div className="space-y-10">
        <WishlistGrid 
          wishlist={wishlist} 
          loading={loading}
          filter={filter}
          onFilterChange={setFilter}
          onRemove={handleRemove}
        />
        {totalPages > 1 && (
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
