"use client";

import { useState } from "react";
import { useWishlist, useRemoveFromWishlist } from "@/lib/hooks/useQueries";
import { WishlistSummary } from "@/components/WishlistSummary";
import { WishlistGrid } from "@/components/WishlistGrid";
import { Pagination } from "@/components/Pagination";

export type WishlistItem = {
  id: string;
  book_type: "PHYSICAL" | "DIGITAL";
  created_at: string;
  bookAvailable: boolean;
  bookDeleted: boolean;
  physical_book?: { id: string; title: string; cover_image_url: string; available: number; copies: number; pages: number; deleted_at: string | null; author: { id: string; name: string }; category: { id: string; name: string } } | null;
  digital_book?: { id: string; title: string; cover_image_url: string; pdf_access: string; pages: number; deleted_at: string | null; author: { id: string; name: string }; category: { id: string; name: string } } | null;
};

export default function WishlistPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "physical" | "digital">("all");
  const limit = 12;

  const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (filter !== "all") queryParams.append("book_type", filter);

  const { data: wishlistData, isLoading, error } = useWishlist(queryParams.toString());
  const removeFromWishlist = useRemoveFromWishlist();

  const wishlist: WishlistItem[] = (wishlistData?.wishlist || []) as unknown as WishlistItem[];
  const totalPages = wishlistData?.meta?.totalPages || 1;

  const handleRemove = async (itemId: string) => {
    await removeFromWishlist.mutateAsync(itemId);
  };

  return (
    <div className="p-6 lg:p-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">My Wishlist</h1>
        <p className="text-secondary font-medium">Books you want to read. We&apos;ll notify you when they&apos;re available.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error instanceof Error ? error.message : "Failed to load wishlist"}</div>
      )}

      <WishlistSummary wishlist={wishlist} loading={isLoading} />

      <div className="space-y-10">
        <WishlistGrid wishlist={wishlist} loading={isLoading} filter={filter} onFilterChange={setFilter} onRemove={handleRemove} />
        {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}
