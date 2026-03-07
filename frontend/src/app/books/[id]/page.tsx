"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Star, ChevronRight, Book as BookIcon, Info, Heart, AlertCircle, FileText } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { API_BASE_URL, fetchApi, fetchCurrentUser } from "@/lib/api";

type User = { id: string; name: string; email: string; role: string } | null;

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { id: string; name: string };
};

type RatingSummary = {
  average: number;
  total: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

type PhysicalBook = {
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
  rating: RatingSummary;
  reviews: ReviewItem[];
  userContext: {
    hasActiveRental: boolean;
    activeRental: unknown;
    isInWishlist: boolean;
    wishlistId: string | null;
  } | null;
  _count: { rentals: number; reviews: number; wishlists: number };
};

type DigitalBook = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pages: number;
  pdf_name: string;
  pdf_access: "FREE" | "PAID" | "RESTRICTED";
  deleted_at: string | null;
  author: { id: string; name: string; bio: string; image: string | null };
  category: { id: string; name: string; slug: string };
  rating: RatingSummary;
  reviews: ReviewItem[];
  userContext: {
    isInWishlist: boolean;
    wishlistId: string | null;
  } | null;
  _count: { reviews: number; wishlists: number };
};

type RelatedBook = {
  id: string;
  title: string;
  cover_image_url: string;
};

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const forcedType = searchParams.get("type") === "digital" ? "digital" : "physical";

  const [bookType, setBookType] = useState<"physical" | "digital">(forcedType);
  const [physicalBook, setPhysicalBook] = useState<PhysicalBook | null>(null);
  const [digitalBook, setDigitalBook] = useState<DigitalBook | null>(null);
  const [related, setRelated] = useState<RelatedBook[]>([]);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [myReview, setMyReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const book = bookType === "physical" ? physicalBook : digitalBook;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await fetchCurrentUser().catch(() => null);
      setUser(currentUser);

      let foundType: "physical" | "digital" = forcedType;
      let detail: PhysicalBook | DigitalBook | null = null;

      if (forcedType === "digital") {
        const digital = await fetchApi(`/digital-books/${params.id}`);
        detail = digital?.data?.book || null;
      } else {
        try {
          const physical = await fetchApi(`/books/${params.id}`);
          detail = physical?.data?.book || null;
          foundType = "physical";
        } catch {
          const digital = await fetchApi(`/digital-books/${params.id}`);
          detail = digital?.data?.book || null;
          foundType = "digital";
        }
      }

      if (!detail) {
        setError("Book not found");
        return;
      }

      setBookType(foundType);
      if (foundType === "physical") {
        setPhysicalBook(detail as PhysicalBook);
        setDigitalBook(null);
      } else {
        setDigitalBook(detail as DigitalBook);
        setPhysicalBook(null);
      }

      const [reviewsRes, myReviewRes, relatedRes] = await Promise.all([
        fetchApi(`/reviews/${foundType}/${params.id}?limit=6`),
        currentUser ? fetchApi(`/reviews/${foundType}/${params.id}/mine`).catch(() => null) : Promise.resolve(null),
        fetchApi(`/${foundType === "physical" ? "books" : "digital-books"}?author_id=${detail.author.id}&limit=6`).catch(() => null),
      ]);

      const reviews = (reviewsRes?.reviews || []) as ReviewItem[];
      const ratingSummary = (reviewsRes?.ratingSummary || detail.rating) as RatingSummary;

      if (foundType === "physical") {
        setPhysicalBook((prev) => (prev ? { ...prev, reviews, rating: ratingSummary } : prev));
      } else {
        setDigitalBook((prev) => (prev ? { ...prev, reviews, rating: ratingSummary } : prev));
      }

      const mine = myReviewRes?.data?.review || null;
      setMyReview(mine);
      setReviewRating(mine?.rating || 0);
      setReviewComment(mine?.comment || "");

      const relatedBooks = (relatedRes?.books || [])
        .filter((b: RelatedBook) => b.id !== params.id)
        .slice(0, 4);
      setRelated(relatedBooks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load book");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, forcedType]);

  const handleBorrow = async () => {
    if (!user) return router.push("/auth/login");
    if (!physicalBook) return;

    try {
      setActionLoading(true);
      await fetchApi("/rentals/borrow", {
        method: "POST",
        body: JSON.stringify({ book_id: physicalBook.id }),
      });
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!user) return router.push("/auth/login");
    if (!physicalBook) return;

    try {
      setActionLoading(true);
      await fetchApi("/reservations", {
        method: "POST",
        body: JSON.stringify({ book_id: physicalBook.id }),
      });
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) return router.push("/auth/login");
    if (!book) return;

    try {
      setActionLoading(true);
      const isInWishlist = book.userContext?.isInWishlist;
      const wishlistId = book.userContext?.wishlistId;
      if (isInWishlist && wishlistId) {
        await fetchApi(`/wishlist/${wishlistId}`, { method: "DELETE" });
      } else {
        await fetchApi("/wishlist", {
          method: "POST",
          body: JSON.stringify({
            bookType: bookType.toUpperCase(),
            bookId: book.id,
          }),
        });
      }
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const openDigital = (download = false) => {
    if (!book || bookType !== "digital") return;
    if (!user) return router.push("/auth/login");
    const url = `${API_BASE_URL}/digital-books/${book.id}/pdf${download ? "?download=true" : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitReview = async () => {
    if (!user) return router.push("/auth/login");
    if (!book || reviewRating < 1) return;

    try {
      setReviewBusy(true);
      if (myReview) {
        await fetchApi(`/reviews/${myReview.id}`, {
          method: "PATCH",
          body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
        });
      } else {
        await fetchApi(`/reviews/${bookType}/${book.id}`, {
          method: "POST",
          body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
        });
      }
      await loadData();
    } finally {
      setReviewBusy(false);
    }
  };

  const removeReview = async () => {
    if (!user || !myReview) return;
    try {
      setReviewBusy(true);
      await fetchApi(`/reviews/${myReview.id}`, { method: "DELETE" });
      setMyReview(null);
      setReviewRating(0);
      setReviewComment("");
      await loadData();
    } finally {
      setReviewBusy(false);
    }
  };

  const canBorrow = bookType === "physical" && physicalBook && physicalBook.available > 0 && !physicalBook.userContext?.hasActiveRental;
  const canReserve = bookType === "physical" && physicalBook && physicalBook.available <= 0;

  const breadcrumbType = bookType === "digital" ? "Digital" : "Physical";

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
            <Link href="/books" className="inline-block px-6 py-3 rounded-xl bg-primary text-background font-bold hover:bg-accent transition-all">
              Browse Books
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="grow mx-auto max-w-7xl w-full px-6 py-8 lg:py-12">
        <nav className="flex items-center gap-2 text-xs font-bold text-secondary/60 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/books" className="hover:text-primary transition-colors">Books</Link>
          <ChevronRight size={14} />
          <span className="text-secondary">{breadcrumbType}</span>
          <ChevronRight size={14} />
          <span className="text-secondary">{book.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          <div className="lg:w-1/3 xl:w-1/4">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform -rotate-1 hover:rotate-0 transition-transform duration-500">
              <Image src={book.cover_image_url || "/auth/image.png"} alt={book.title} fill priority className="object-cover" />
              <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg ${bookType === "digital" ? "bg-[#8B6B4A]/90 text-white" : bookType === "physical" && (book as PhysicalBook).available > 0 ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}>
                <BookIcon size={14} />
                {bookType === "digital" ? ((book as DigitalBook).pdf_access === "RESTRICTED" ? "Read Only" : "Download") : (book as PhysicalBook).available > 0 ? `${(book as PhysicalBook).available} Available` : "Unavailable"}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary leading-tight">{book.title}</h1>
                <p className="text-lg text-secondary font-medium">by <span className="text-primary font-bold">{book.author.name}</span></p>
              </div>
              <div className="flex flex-col gap-3">
                {bookType === "physical" ? (
                  <>
                    <button
                      onClick={handleBorrow}
                      disabled={!canBorrow || actionLoading}
                      className={`w-full md:w-auto rounded-full px-10 py-4 text-base font-bold shadow-xl transition-all active:scale-95 ${canBorrow ? "bg-primary text-background hover:bg-accent" : "bg-muted text-secondary/50 cursor-not-allowed"}`}
                    >
                      {actionLoading ? "Working..." : canBorrow ? "Borrow Book" : "Unavailable"}
                    </button>
                    {canReserve && (
                      <button onClick={handleReserve} disabled={actionLoading} className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95">
                        Reserve Book
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => openDigital(false)} disabled={actionLoading} className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold shadow-xl transition-all active:scale-95 bg-primary text-background hover:bg-accent">
                      Read Now
                    </button>
                    {(book as DigitalBook).pdf_access !== "RESTRICTED" && (
                      <button onClick={() => openDigital(true)} disabled={actionLoading} className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95">
                        Download PDF
                      </button>
                    )}
                  </>
                )}

                <button onClick={handleWishlist} disabled={actionLoading} className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Heart size={18} fill={book.userContext?.isInWishlist ? "currentColor" : "none"} />
                  {book.userContext?.isInWishlist ? "In Wishlist" : "Add to Wishlist"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Rating</p>
                <div className="flex items-center justify-center gap-1 text-[#E58A00]">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm font-bold">{book.rating.total > 0 ? book.rating.average.toFixed(1) : "N/A"}</span>
                </div>
                <p className="text-[9px] text-secondary/60">{book.rating.total} {book.rating.total === 1 ? "review" : "reviews"}</p>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Category</p>
                <p className="text-sm font-bold text-primary">{book.category.name}</p>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">{bookType === "digital" ? "Access" : "Pages"}</p>
                <p className="text-sm font-bold text-primary">{bookType === "digital" ? ((book as DigitalBook).pdf_access === "RESTRICTED" ? "Read Only" : "Read + Download") : book.pages}</p>
              </div>
            </div>

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
                  <h2 className="text-2xl font-serif font-bold text-primary">About the Author</h2>
                  <div className="prose prose-stone max-w-none text-secondary leading-relaxed font-medium">
                    <p>{book.author.bio}</p>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <h2 className="text-2xl font-serif font-bold text-primary">Your Review</h2>
                <div className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)} className="text-[#E58A00]">
                        <Star size={18} fill={reviewRating >= n ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write your review"
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-primary focus:outline-none"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={submitReview} disabled={reviewBusy || reviewRating < 1} className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-bold disabled:opacity-40">
                      {reviewBusy ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
                    </button>
                    {myReview && (
                      <button onClick={removeReview} disabled={reviewBusy} className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-primary">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {book.reviews.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-2xl font-serif font-bold text-primary">Recent Reviews</h2>
                  <div className="space-y-4">
                    {book.reviews.map((review) => (
                      <div key={review.id} className="bg-card rounded-xl p-4 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-primary">{review.user.name}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} size={14} fill={i <= review.rating ? "currentColor" : "none"} className={i <= review.rating ? "text-[#E58A00]" : "text-secondary/30"} />
                            ))}
                          </div>
                        </div>
                        {review.comment && <p className="text-sm text-secondary">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {related.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                    <FileText size={22} className="text-secondary" />
                    More by {book.author.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {related.map((item) => (
                      <Link key={item.id} href={bookType === "digital" ? `/books/${item.id}?type=digital` : `/books/${item.id}`} className="bg-card rounded-xl border border-border/50 p-3 hover:shadow-md transition-all">
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3">
                          <Image src={item.cover_image_url || "/auth/image.png"} alt={item.title} fill className="object-cover" />
                        </div>
                        <p className="text-xs font-bold text-primary line-clamp-2">{item.title}</p>
                      </Link>
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
