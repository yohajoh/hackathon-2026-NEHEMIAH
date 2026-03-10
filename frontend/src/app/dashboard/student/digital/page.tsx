"use client";

import { Suspense } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/api";
import { useDigitalBooksList } from "@/lib/hooks/useQueries";
import { LoadingCard } from "@/components/ui/Loading";

type DigitalBook = {
  id: string;
  title: string;
  cover_image_url: string;
  pdf_access: "FREE" | "PAID" | "RESTRICTED";
  author: { name: string };
  category: { name: string };
};

function DigitalLibraryContent() {
  const { data: booksData, isLoading } = useDigitalBooksList("limit=200");
  const books: DigitalBook[] = (booksData?.books as unknown as DigitalBook[]) || [];

  const openReader = (id: string, download = false) => {
    const url = `${API_BASE_URL}/digital-books/${id}/pdf${download ? "?download=true" : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-2xl border border-border/60 p-4 space-y-3">
              <div className="h-44 rounded-xl bg-muted/40 overflow-hidden">
                <Image src={book.cover_image_url} alt={book.title} width={640} height={440} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary line-clamp-1">{book.title}</p>
                <p className="text-xs text-secondary">{book.author?.name} • {book.category?.name}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary">
                  {book.pdf_access === "RESTRICTED" ? "Read Only" : "Download Allowed"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openReader(book.id, false)} className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg">
                    Read
                  </button>
                  {book.pdf_access !== "RESTRICTED" && (
                    <button onClick={() => openReader(book.id, true)} className="px-3 py-1.5 text-xs font-bold bg-primary text-background rounded-lg">
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentDigitalLibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-12"><LoadingCard /></div>}>
      <DigitalLibraryContent />
    </Suspense>
  );
}
