"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, fetchApi } from "@/lib/api";
import { LoadingCard } from "@/components/ui/Loading";
import { toast } from "sonner";

type DigitalBook = {
  id: string;
  title: string;
  cover_image_url?: string;
  pdf_access: "FREE" | "PAID" | "RESTRICTED";
  author?: { name?: string };
  category?: { name?: string };
};

type DigitalBooksApiResponse = {
  books: DigitalBook[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

const FALLBACK_COVER = "https://placehold.co/640x440?text=Digital+Book";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

async function fetchDigitalBooksPage(page: number): Promise<DigitalBooksApiResponse> {
  return fetchApi<DigitalBooksApiResponse>(`/digital-books?page=${page}&limit=20`);
}

function DigitalLibraryContent() {
  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery<DigitalBooksApiResponse>({
    queryKey: ["digital-books", "student-page", page],
    queryFn: () => fetchDigitalBooksPage(page),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const books = Array.isArray(data?.books) ? data.books : [];
  const totalPages = Math.max(1, Number(data?.meta?.totalPages || 1));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const openReader = async (book: DigitalBook, download = false) => {
    try {
      setOpeningId(book.id);

      const url = `${API_BASE_URL}/digital-books/${book.id}/pdf${download ? "?download=true" : ""}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const raw = await response.text();
        try {
          const parsed = JSON.parse(raw) as { message?: string };
          throw new Error(parsed.message || `Failed to open PDF (${response.status})`);
        } catch {
          throw new Error(`Failed to open PDF (${response.status})`);
        }
      }

      const contentType = response.headers.get("Content-Type");
      const blob = await response.blob();
      if (!contentType?.includes("application/pdf") || blob.size === 0) {
        throw new Error("PDF file is empty or invalid. Please contact the admin.");
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition");
      const fileName = disposition?.split("filename=")[1]?.replace(/"/g, "") || `${book.title}.pdf`;

      if (download) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open this PDF right now.";
      toast.error(message);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Digital Library</h1>
        <p className="text-secondary font-medium">Read digital books online and download when allowed.</p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-secondary text-sm">Loading digital books...</div>
      ) : books.length === 0 ? (
        <div className="py-16 text-center text-secondary text-sm">No digital books available.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {books.map((book) => (
              <div key={book.id} className="group bg-white rounded-2xl border border-border/60 p-4 space-y-3">
                <div className="relative h-44 rounded-xl bg-muted/40 overflow-hidden">
                  <Image
                    src={book.cover_image_url || FALLBACK_COVER}
                    alt={book.title}
                    width={640}
                    height={440}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <Link
                    href={`/books/${toSlug(book.title)}?type=digital`}
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary/70 text-background font-bold text-sm flex items-center justify-center"
                  >
                    View Details
                  </Link>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary line-clamp-1">{book.title}</p>
                  <p className="text-xs text-secondary">
                    {book.author?.name || "Unknown Author"} • {book.category?.name || "Uncategorized"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary">
                    {book.pdf_access === "RESTRICTED" ? "Read Only" : "Download Allowed"}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/books/${toSlug(book.title)}?type=digital`}
                      className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => openReader(book, false)}
                      disabled={openingId === book.id}
                      className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg disabled:opacity-50"
                    >
                      {openingId === book.id ? "Opening..." : "Read"}
                    </button>
                    {book.pdf_access !== "RESTRICTED" && (
                      <button
                        onClick={() => openReader(book, true)}
                        disabled={openingId === book.id}
                        className="px-3 py-1.5 text-xs font-bold bg-primary text-background rounded-lg disabled:opacity-50"
                      >
                        {openingId === book.id ? "Preparing..." : "Download"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center justify-between">
            <p className="text-xs text-secondary">
              Page {page} of {totalPages} {isFetching ? "• Updating..." : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!hasPrev || isFetching}
                className="px-3 py-1.5 text-xs font-bold border border-border rounded-lg text-primary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={!hasNext || isFetching}
                className="px-3 py-1.5 text-xs font-bold bg-primary text-background rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StudentDigitalLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-12">
          <LoadingCard />
        </div>
      }
    >
      <DigitalLibraryContent />
    </Suspense>
  );
}
