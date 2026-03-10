"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Star, ChevronRight, Book as BookIcon, Info, Heart, AlertCircle, FileText } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { API_BASE_URL, fetchApi, fetchCurrentUser } from "@/lib/api";
import { toast } from "sonner";

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
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
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
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
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
  type: "physical" | "digital";
};

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from") || "";
  const booksHref = fromQuery ? `/books?${fromQuery}` : "/books";

  const forcedType = searchParams.get("type") === "digital" ? "digital" : "physical";

  const [bookType, setBookType] = useState<"physical" | "digital">(forcedType);
  const [physicalBook, setPhysicalBook] = useState<PhysicalBook | null>(null);
  const [digitalBook, setDigitalBook] = useState<DigitalBook | null>(null);
  const [related, setRelated] = useState<RelatedBook[]>([]);
  const [relatedSource, setRelatedSource] = useState<"author" | "category">("author");
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [myReview, setMyReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [activeImage, setActiveImage] = useState<string>("");

  const book = bookType === "physical" ? physicalBook : digitalBook;

  const updateCurrentBook = (updater: (current: PhysicalBook | DigitalBook) => PhysicalBook | DigitalBook) => {
    if (bookType === "physical") {
      setPhysicalBook((prev) => (prev ? (updater(prev) as PhysicalBook) : prev));
      return;
    }
    setDigitalBook((prev) => (prev ? (updater(prev) as DigitalBook) : prev));
  };
  const galleryImages = useMemo(() => {
    if (!book) return [];
    const extra = (book.images || []).map((img) => img.image_url);
    return Array.from(new Set([book.cover_image_url, ...extra].filter(Boolean)));
  }, [book]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUserPromise = fetchCurrentUser().catch(() => null);

      let foundType: "physical" | "digital" = forcedType;
      let pageData: {
        book: PhysicalBook | DigitalBook;
        myReview?: { id: string; rating: number; comment: string | null } | null;
        related?: RelatedBook[];
        relatedSource?: "author" | "category";
      } | null = null;

      if (forcedType === "digital") {
        const digital = await fetchApi(`/digital-books/${params.id}/page-data`);
        pageData = digital?.data || null;
      } else {
        try {
          const physical = await fetchApi(`/books/${params.id}/page-data`);
          pageData = physical?.data || null;
          foundType = "physical";
        } catch {
          const digital = await fetchApi(`/digital-books/${params.id}/page-data`);
          pageData = digital?.data || null;
          foundType = "digital";
        }
      }

      const detail = pageData?.book || null;
      if (!detail) {
        setError("Book not found");
        return;
      }

      const currentUser = await currentUserPromise;
      setUser(currentUser);

      setBookType(foundType);
      if (foundType === "physical") {
        setPhysicalBook(detail as PhysicalBook);
        setDigitalBook(null);
      } else {
        setDigitalBook(detail as DigitalBook);
        setPhysicalBook(null);
      }
      const detailImages = ("images" in detail && Array.isArray(detail.images) ? detail.images : []) as Array<{
        image_url: string;
      }>;
      const firstImage = detailImages[0]?.image_url || detail.cover_image_url;
      setActiveImage(firstImage);

      const mine = pageData?.myReview || null;
      setMyReview(mine);
      setReviewRating(mine?.rating || 0);
      setReviewComment(mine?.comment || "");

      const relatedBooks = (pageData?.related || []) as RelatedBook[];
      setRelatedSource(pageData?.relatedSource || "author");
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
      const borrowRes = await fetchApi("/rentals/borrow", {
        method: "POST",
        body: JSON.stringify({ book_id: physicalBook.id }),
      });

      const rentalId = borrowRes?.data?.rental?.id;
      if (!rentalId) {
        throw new Error("Borrowed rental was not created");
      }

      const payRes = await fetchApi(`/payments/rental/${rentalId}/initiate`, {
        method: "POST",
        body: JSON.stringify({ method: "CHAPA", context: "BORROW" }),
      });
      const chapaUrl = payRes?.data?.chapaUrl || payRes?.chapaUrl;
      if (!chapaUrl) {
        throw new Error("Payment checkout URL was not returned");
      }
      window.location.href = chapaUrl;
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Borrow checkout failed";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!user) return router.push("/auth/login");
    if (!physicalBook) return;

    const previousPhysicalBook = physicalBook;

    try {
      setActionLoading(true);
      setPhysicalBook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          userContext: {
            ...(prev.userContext || {
              hasActiveRental: false,
              activeRental: null,
              isInWishlist: false,
              wishlistId: null,
            }),
          },
        };
      });

      await fetchApi("/reservations", {
        method: "POST",
        body: JSON.stringify({ book_id: physicalBook.id }),
      });
      toast.success("Reservation placed successfully");
      void loadData();
    } catch {
      setPhysicalBook(previousPhysicalBook);
      toast.error("Failed to place reservation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) return router.push("/auth/login");
    if (!book) return;

    const previousPhysicalBook = physicalBook;
    const previousDigitalBook = digitalBook;

    try {
      setActionLoading(true);
      const isInWishlist = book.userContext?.isInWishlist;
      const wishlistId = book.userContext?.wishlistId;

      updateCurrentBook((current) => {
        if ("copies" in current) {
          const ctx = current.userContext || {
            hasActiveRental: false,
            activeRental: null,
            isInWishlist: false,
            wishlistId: null,
          };
          return {
            ...current,
            userContext: {
              ...ctx,
              isInWishlist: !ctx.isInWishlist,
              wishlistId: ctx.isInWishlist ? null : ctx.wishlistId,
            },
          };
        }

        const digitalCtx = current.userContext || {
          isInWishlist: false,
          wishlistId: null,
        };
        return {
          ...current,
          userContext: {
            ...digitalCtx,
            isInWishlist: !digitalCtx.isInWishlist,
            wishlistId: digitalCtx.isInWishlist ? null : digitalCtx.wishlistId,
          },
        };
      });

      if (isInWishlist && wishlistId) {
        await fetchApi(`/wishlist/${wishlistId}`, { method: "DELETE" });
        toast.success("Removed from wishlist");
      } else {
        await fetchApi("/wishlist", {
          method: "POST",
          body: JSON.stringify({
            bookType: bookType.toUpperCase(),
            bookId: book.id,
          }),
        });
        toast.success("Added to wishlist");
      }
      void loadData();
    } catch {
      setPhysicalBook(previousPhysicalBook);
      setDigitalBook(previousDigitalBook);
      toast.error("Failed to update wishlist");
    } finally {
      setActionLoading(false);
    }
  };

  const openDigital = async (download = false) => {
    if (!book || bookType !== "digital") {
      return;
    }

    try {
      setActionLoading(true);

      const currentUser = user ?? (await fetchCurrentUser());
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      if (!user) setUser(currentUser);

      const url = `${API_BASE_URL}/digital-books/${book.id}/pdf${download ? "?download=true" : ""}`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Failed to load PDF (${response.status})`);
        } catch {
          throw new Error(`Failed to load PDF (${response.status}): ${errorText}`);
        }
      }

      const contentType = response.headers.get("Content-Type");
      const blob = await response.blob();

      if (!contentType?.includes("application/pdf") || blob.size === 0) {
        throw new Error("PDF file is empty - the PDF may not have been uploaded correctly");
      }

      const blobUrl = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers.get("Content-Disposition");
      const fileName = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `${book.title}.pdf`;

      if (download) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(blobUrl, "_blank");
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to open PDF. Make sure you are logged in and the PDF was uploaded correctly.";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) return router.push("/auth/login");
    if (!book || reviewRating < 1) return;

    const previousPhysicalBook = physicalBook;
    const previousDigitalBook = digitalBook;
    const previousMyReview = myReview;

    const optimisticReview = {
      id: myReview?.id || `temp-${Date.now()}`,
      rating: reviewRating,
      comment: reviewComment,
      created_at: new Date().toISOString(),
      user: { id: user.id, name: user.name },
    };

    const nextReviews = myReview
      ? (book.reviews || []).map((r) => (r.id === myReview.id ? optimisticReview : r))
      : [optimisticReview, ...(book.reviews || [])];

    const total = nextReviews.length;
    const average = total > 0 ? nextReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution = {
      1: nextReviews.filter((r) => r.rating === 1).length,
      2: nextReviews.filter((r) => r.rating === 2).length,
      3: nextReviews.filter((r) => r.rating === 3).length,
      4: nextReviews.filter((r) => r.rating === 4).length,
      5: nextReviews.filter((r) => r.rating === 5).length,
    } as const;

    setMyReview({ id: optimisticReview.id, rating: reviewRating, comment: reviewComment || null });
    updateCurrentBook((current) => ({
      ...current,
      reviews: nextReviews,
      rating: {
        ...current.rating,
        average: Number(average.toFixed(1)),
        total,
        distribution: {
          1: distribution[1],
          2: distribution[2],
          3: distribution[3],
          4: distribution[4],
          5: distribution[5],
        },
      },
    }));

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
      toast.success("Review saved");
      void loadData();
    } catch {
      setPhysicalBook(previousPhysicalBook);
      setDigitalBook(previousDigitalBook);
      setMyReview(previousMyReview);
      toast.error("Failed to save review");
    } finally {
      setReviewBusy(false);
    }
  };

  const removeReview = async () => {
    if (!user || !myReview) return;

    const previousPhysicalBook = physicalBook;
    const previousDigitalBook = digitalBook;
    const previousMyReview = myReview;

    setMyReview(null);
    setReviewRating(0);
    setReviewComment("");
    updateCurrentBook((current) => {
      const nextReviews = (current.reviews || []).filter((r) => r.id !== previousMyReview.id);
      const total = nextReviews.length;
      const average = total > 0 ? nextReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
      return {
        ...current,
        reviews: nextReviews,
        rating: {
          ...current.rating,
          average: Number(average.toFixed(1)),
          total,
          distribution: {
            1: nextReviews.filter((r) => r.rating === 1).length,
            2: nextReviews.filter((r) => r.rating === 2).length,
            3: nextReviews.filter((r) => r.rating === 3).length,
            4: nextReviews.filter((r) => r.rating === 4).length,
            5: nextReviews.filter((r) => r.rating === 5).length,
          },
        },
      };
    });

    try {
      setReviewBusy(true);
      await fetchApi(`/reviews/${myReview.id}`, { method: "DELETE" });
      toast.success("Review removed");
      void loadData();
    } catch {
      setPhysicalBook(previousPhysicalBook);
      setDigitalBook(previousDigitalBook);
      setMyReview(previousMyReview);
      setReviewRating(previousMyReview.rating);
      setReviewComment(previousMyReview.comment || "");
      toast.error("Failed to remove review");
    } finally {
      setReviewBusy(false);
    }
  };

  const canBorrow =
    bookType === "physical" && physicalBook && physicalBook.available > 0 && !physicalBook.userContext?.hasActiveRental;
  const canReserve = bookType === "physical" && physicalBook && physicalBook.available <= 0;

  const breadcrumbType = bookType === "digital" ? "Digital" : "Physical";

  if (!loading && (error || !book)) {
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="grow mx-auto max-w-7xl w-full px-6 py-8 lg:py-12">
        <nav className="flex items-center gap-2 text-xs font-bold text-secondary/60 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href={booksHref} className="hover:text-primary transition-colors">
            Books
          </Link>
          <ChevronRight size={14} />
          <span className="text-secondary">{breadcrumbType}</span>
          <ChevronRight size={14} />
          <span className="text-secondary">{book?.title || "Book Details"}</span>
        </nav>

        {loading || !book ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
              <div className="aspect-[3/4] rounded-2xl bg-muted/40 border border-border/50" />
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">Book Details</h1>
                <p className="text-secondary">Loading book information...</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 rounded-2xl bg-muted/40 border border-border/50" />
                  <div className="h-24 rounded-2xl bg-muted/40 border border-border/50" />
                  <div className="h-24 rounded-2xl bg-muted/40 border border-border/50" />
                </div>
              </div>
            </div>
            <section className="space-y-3">
              <h2 className="text-2xl font-serif font-bold text-primary">About This Book</h2>
              <div className="h-24 rounded-2xl bg-muted/40 border border-border/50" />
            </section>
            <section className="space-y-3">
              <h2 className="text-2xl font-serif font-bold text-primary">About the Author</h2>
              <div className="h-24 rounded-2xl bg-muted/40 border border-border/50" />
            </section>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            <div className="lg:w-1/3 xl:w-1/4">
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                <Image
                  src={activeImage || book.cover_image_url || "/auth/image.png"}
                  alt={book.title}
                  fill
                  priority
                  className="object-cover"
                />
                <div
                  className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg ${bookType === "digital" ? "bg-[#8B6B4A]/90 text-white" : bookType === "physical" && (book as PhysicalBook).available > 0 ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}
                >
                  <BookIcon size={14} />
                  {bookType === "digital"
                    ? (book as DigitalBook).pdf_access === "RESTRICTED"
                      ? "Read Only"
                      : "Download"
                    : (book as PhysicalBook).available > 0
                      ? `${(book as PhysicalBook).available} Available`
                      : "Unavailable"}
                </div>
              </div>
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {galleryImages.slice(0, 10).map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      onClick={() => setActiveImage(img)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${activeImage === img ? "border-primary" : "border-border/50"}`}
                    >
                      <Image src={img} alt={`${book.title} ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary leading-tight">
                    {book.title}
                  </h1>
                  <p className="text-lg text-secondary font-medium">
                    by <span className="text-primary font-bold">{book.author.name}</span>
                  </p>
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
                        <button
                          onClick={handleReserve}
                          disabled={actionLoading}
                          className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95"
                        >
                          Reserve Book
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openDigital(false)}
                        disabled={actionLoading}
                        className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold shadow-xl transition-all active:scale-95 bg-primary text-background hover:bg-accent"
                      >
                        Read Now
                      </button>
                      {(book as DigitalBook).pdf_access !== "RESTRICTED" && (
                        <button
                          onClick={() => openDigital(true)}
                          disabled={actionLoading}
                          className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95"
                        >
                          Download PDF
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={handleWishlist}
                    disabled={actionLoading}
                    className="w-full md:w-auto rounded-full px-10 py-4 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-background transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
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
                    <span className="text-sm font-bold">
                      {book.rating.total > 0 ? book.rating.average.toFixed(1) : "N/A"}
                    </span>
                  </div>
                  <p className="text-[9px] text-secondary/60">
                    {book.rating.total} {book.rating.total === 1 ? "review" : "reviews"}
                  </p>
                </div>
                <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Category</p>
                  <p className="text-sm font-bold text-primary">{book.category.name}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 border border-border/50 text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                    {bookType === "digital" ? "Access" : "Pages"}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {bookType === "digital"
                      ? (book as DigitalBook).pdf_access === "RESTRICTED"
                        ? "Read Only"
                        : "Read + Download"
                      : book.pages}
                  </p>
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

                {(book.author.bio || book.author.image) && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-serif font-bold text-primary">About the Author</h2>
                    <div className="bg-card rounded-2xl p-5 border border-border/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-primary font-bold text-lg">{book.author.name}</p>
                          <p className="text-secondary leading-relaxed font-medium">
                            {book.author.bio || "No biography has been added for this author yet."}
                          </p>
                        </div>
                        <div className="relative h-20 w-20 rounded-full overflow-hidden border border-border/60 bg-muted/50 shrink-0">
                          <Image
                            src={book.author.image || "/auth/image.png"}
                            alt={book.author.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
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
                      <button
                        onClick={submitReview}
                        disabled={reviewBusy || reviewRating < 1}
                        className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-bold disabled:opacity-40"
                      >
                        {reviewBusy ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
                      </button>
                      {myReview && (
                        <button
                          onClick={removeReview}
                          disabled={reviewBusy}
                          className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-primary"
                        >
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
                                <Star
                                  key={i}
                                  size={14}
                                  fill={i <= review.rating ? "currentColor" : "none"}
                                  className={i <= review.rating ? "text-[#E58A00]" : "text-secondary/30"}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && <p className="text-sm text-secondary">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                    <FileText size={22} className="text-secondary" />
                    {relatedSource === "author" ? `More by ${book.author.name}` : `Related in ${book.category.name}`}
                  </h2>
                  {related.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border/50 p-6 text-secondary text-sm">
                      No related books found for this author or category yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {related.map((item) => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={item.type === "digital" ? `/books/${item.id}?type=digital` : `/books/${item.id}`}
                          className="bg-card rounded-xl border border-border/50 p-3 hover:shadow-md transition-all"
                        >
                          <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3">
                            <Image
                              src={item.cover_image_url || "/auth/image.png"}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-xs font-bold text-primary line-clamp-2">{item.title}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
