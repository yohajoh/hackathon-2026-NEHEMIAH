"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Star,
  ChevronRight,
  Book as BookIcon,
  Info,
  Heart,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { fetchApi, fetchCurrentUser } from "@/lib/api";

type Book = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pages: number;
  copies: number;
  available: number;
  deleted_at: string | null;
  author: { id: string; name: string; bio: string; image: string | null };
  category: { id: string; name: string; slug: string };
  rating: {
    average: number;
    total: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user: { id: string; name: string };
  }>;
  userContext: {
    hasActiveRental: boolean;
    activeRental: any;
    isInWishlist: boolean;
    wishlistId: string | null;
  } | null;
  _count: { rentals: number; reviews: number; wishlists: number };
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrowing, setBorrowing] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        const [bookData, userData] = await Promise.all([
          fetchApi(`/books/${params.id}`),
          fetchCurrentUser().catch(() => null),
        ]);

        if (bookData?.data?.book) {
          setBook(bookData.data.book);
        }
        setUser(userData);
      } catch (e) {
        console.error("Failed to load book:", e);
        setError(e instanceof Error ? e.message : "Failed to load book");
      } finally {
        setLoading(false);
      }
    }
    loadBook();
  }, [params.id]);

  const handleBorrow = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setBorrowing(true);
      await fetchApi("/rentals/borrow", {
        method: "POST",
        body: JSON.stringify({ book_id: book?.id }),
      });
      alert("Book borrowed successfully! Check your dashboard.");
      // Reload book data
      const bookData = await fetchApi(`/books/${params.id}`);
      if (bookData?.data?.book) {
        setBook(bookData.data.book);
      }
    } catch (e) {
      console.error("Borrow error:", e);
      alert(e instanceof Error ? e.message : "Failed to borrow book");
    } finally {
      setBorrowing(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setWishlistLoading(true);
      if (book?.userContext?.isInWishlist) {
        // Remove from wishlist
        await fetchApi(`/wishlist/${book.userContext.wishlistId}`, {
          method: "DELETE",
        });
      } else {
        // Add to wishlist
        await fetchApi("/wishlist", {
          method: "POST",
          body: JSON.stringify({
            bookType: "PHYSICAL",
            bookId: book?.id,
          }),
        });
      }
      // Reload book data
      const bookData = await fetchApi(`/books/${params.id}`);
      if (bookData?.data?.book) {
        setBook(bookData.data.book);
      }
    } catch (e) {
      console.error("Wishlist error:", e);
      alert(e instanceof Error ? e.message : "Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
        <Navbar />
        <main className="grow mx-auto max-w-7xl w-full px-6 py-8 lg:py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted/50 rounded w-1/3" />
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="lg:w-1/3 aspect-[3/4] bg-muted/50 rounded-2xl" />
              <div className="flex-1 space-y-6">
                <div className="h-12 bg-muted/50 rounded" />
                <div className="h-6 bg-muted/50 rounded w-2/3" />
                <div className="h-32 bg-muted/50 rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
        <Navbar />
        <main className="grow mx-auto max-w-7xl w-full px-6 py-8 lg:py-12">
          <div className="text-center py-20">
            <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-primary mb-2">Book Not Found</h1>
            <p className="text-secondary mb-6">{error || "The book you're looking for doesn't exist."}</p>
            <Link
              href="/books"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-background font-bold hover:bg-accent transition-all"
            >
              Browse Books
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canBorrow = book.available > 0 && !book.userContext?.hasActiveRental;

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
          <Link
            href={`/books?category=${book.category.id}`}
            className="hover:text-primary transition-colors"
          >
            {book.category.name}
          </Link>
          <ChevronRight size={14} />
          <span className="text-secondary">{book.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left: Book Cover */}
          <div className="lg:w-1/3 xl:w-1/4">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform -rotate-1 hover:rotate-0 transition-transform duration-500">
              <Image
                src={book.cover_image_url || "/auth/image.png"}
                alt={book.title}
                fill
                priority
                className="object-cover"
              />
              <div
                className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg ${
                  book.available > 0
                    ? "bg-green-500/90 text-white"
                    : "bg-red-500/90 text-white"
                }`}
              >
                <BookIcon size={14} />
                {book.available > 0 ? `${book.available} Available` : "Unavailable"}
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
                  <span className="text-primary font-bold">{book.author.name}</span>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBorrow}
                  disabled={!canBorrow || borrowing}
                  className={`w-full md:w-auto rounded-full px-10 py-4 text-base font-bold shadow-xl transition-all active:scale-95 ${
                    canBorrow
                      ? "bg-primary text-background hover:bg-accent"
                      : "bg-muted text-secondary/50 cursor-not-allowed"
                  }`}
                >
                  {borrowing
                    ? "Borrowing..."
                    : book.userContext?.hasActiveRental
                    ? "Already Borrowed"
                    : book.available > 0
                    ? "Borrow Book"
                    : "Unavailable"}
                </button>
                {user && (
                  <button
                    onClick={handleWishlist}
                    disabled={wishlistLoading}
                    className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Heart
                      size={18}
                      fill={book.userContext?.isInWishlist ? "currentColor" : "none"}
                    />
                    {wishlistLoading
                      ? "..."
                      : book.userContext?.isInWishlist
                      ? "In Wishlist"
                      : "Add to Wishlist"}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Rating
                </p>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm font-bold">
                    {book.rating.total > 0 ? book.rating.average.toFixed(1) : "N/A"}
                  </span>
                </div>
                <p className="text-[9px] text-secondary/60">
                  {book.rating.total} {book.rating.total === 1 ? "review" : "reviews"}
                </p>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Category
                </p>
                <p className="text-sm font-bold text-primary">
                  {book.category.name}
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
                  About This Book
                </h2>
                <div className="prose prose-stone max-w-none text-secondary leading-relaxed font-medium">
                  <p>{book.description}</p>
                </div>
              </section>

              {book.author.bio && (
                <section className="space-y-4">
                  <h2 className="text-2xl font-serif font-bold text-primary">
                    About the Author
                  </h2>
                  <div className="prose prose-stone max-w-none text-secondary leading-relaxed font-medium">
                    <p>{book.author.bio}</p>
                  </div>
                </section>
              )}

              {book.reviews.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-2xl font-serif font-bold text-primary">
                    Recent Reviews
                  </h2>
                  <div className="space-y-4">
                    {book.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-card rounded-xl p-4 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-primary">{review.user.name}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={i < review.rating ? "currentColor" : "none"}
                                className={i < review.rating ? "text-primary" : "text-secondary/30"}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-secondary">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
