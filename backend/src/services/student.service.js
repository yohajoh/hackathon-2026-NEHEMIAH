import { prisma } from "../prisma.js";

const buildCategoryStats = (rows) => {
  const counts = rows.reduce((acc, row) => {
    const category = row.physical_book?.category?.name;
    if (!category) return acc;
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

export const getStudentOverview = async (userId) => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    user,
    rentals,
    wishlistCount,
    reservationCount,
    unreadNotifications,
    paidSummary,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        student_id: true,
        year: true,
        department: true,
        created_at: true,
      },
    }),
    prisma.rental.findMany({
      where: { user_id: userId },
      include: {
        physical_book: {
          select: {
            id: true,
            title: true,
            cover_image_url: true,
            category: { select: { name: true } },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            method: true,
            paid_at: true,
          },
        },
      },
      orderBy: { loan_date: "desc" },
      take: 100,
    }),
    prisma.wishlist.count({ where: { user_id: userId } }),
    prisma.reservation.count({
      where: { user_id: userId, status: { in: ["QUEUED", "NOTIFIED"] } },
    }),
    prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    prisma.payment.aggregate({
      where: { rental: { user_id: userId }, status: "SUCCESS" },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const active = rentals.filter((r) => r.status === "BORROWED");
  const pending = rentals.filter((r) => r.status === "PENDING");
  const completed = rentals.filter((r) =>
    ["RETURNED", "COMPLETED"].includes(r.status),
  );

  const overdueActive = active.filter((r) => new Date(r.due_date) < now);
  const dueSoon = active.filter((r) => {
    const due = new Date(r.due_date);
    return due >= now && due <= in7Days;
  });

  const pendingFine = pending.reduce((sum, r) => sum + Number(r.fine ?? 0), 0);

  const onTimeReturns = completed.filter(
    (r) =>
      r.return_date &&
      new Date(r.return_date).getTime() <= new Date(r.due_date).getTime(),
  ).length;
  const onTimeRate =
    completed.length > 0
      ? Number(((onTimeReturns / completed.length) * 100).toFixed(1))
      : 0;

  const currentRentals = active.slice(0, 5).map((r) => ({
    id: r.id,
    title: r.physical_book?.title,
    cover: r.physical_book?.cover_image_url,
    due_date: r.due_date,
    days_remaining: Math.ceil(
      (new Date(r.due_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    ),
    is_overdue: new Date(r.due_date) < now,
  }));

  const recentHistory = rentals.slice(0, 10).map((r) => ({
    id: r.id,
    status: r.status,
    title: r.physical_book?.title,
    loan_date: r.loan_date,
    due_date: r.due_date,
    return_date: r.return_date,
    fine: Number(r.fine ?? 0),
    payment: r.payment
      ? {
          status: r.payment.status,
          amount: Number(r.payment.amount),
          method: r.payment.method,
        }
      : null,
  }));

  return {
    user,
    stats: {
      totalRentals: rentals.length,
      activeRentals: active.length,
      completedRentals: completed.length,
      overdueActive: overdueActive.length,
      dueSoon: dueSoon.length,
      onTimeRate,
      pendingFine,
      wishlistCount,
      reservationCount,
      unreadNotifications,
      totalPaidFines: Number(paidSummary._sum.amount ?? 0),
      totalPaidTransactions: paidSummary._count.id,
    },
    topCategories: buildCategoryStats(rentals),
    currentRentals,
    recentHistory,
  };
};

export const getStudentRecommendations = async (userId, limit = 8) => {
  const recent = await prisma.rental.findMany({
    where: { user_id: userId },
    select: {
      physical_book: {
        select: {
          category_id: true,
        },
      },
    },
    orderBy: { loan_date: "desc" },
    take: 20,
  });

  const categoryPriority = recent
    .map((r) => r.physical_book?.category_id)
    .filter(Boolean)
    .reduce((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});

  const preferredCategories = Object.entries(categoryPriority)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 3);

  const rentedBookIds = new Set(
    (
      await prisma.rental.findMany({
        where: { user_id: userId },
        select: { book_id: true },
      })
    ).map((r) => r.book_id),
  );

  const recommendations = await prisma.book.findMany({
    where: {
      deleted_at: null,
      id: { notIn: [...rentedBookIds] },
      ...(preferredCategories.length > 0
        ? { category_id: { in: preferredCategories } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      available: true,
      copies: true,
      author: { select: { name: true } },
      category: { select: { id: true, name: true } },
      _count: {
        select: { rentals: true, reviews: true, wishlists: true },
      },
    },
    orderBy: [{ available: "desc" }, { title: "asc" }],
    take: limit,
  });

  const digitalRecommendations = await prisma.digitalBook.findMany({
    where: {
      deleted_at: null,
      ...(preferredCategories.length > 0
        ? { category_id: { in: preferredCategories } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      pdf_access: true,
      author: { select: { name: true } },
      category: { select: { id: true, name: true } },
      _count: { select: { reviews: true, wishlists: true } },
    },
    orderBy: [{ title: "asc" }],
    take: limit,
  });

  return {
    physical: recommendations,
    digital: digitalRecommendations,
  };
};

export const getStudentPopularity = async (limit = 8) => {
  const [mostRented, topRated] = await Promise.all([
    prisma.rental.groupBy({
      by: ["book_id"],
      _count: { book_id: true },
      orderBy: { _count: { book_id: "desc" } },
      take: limit,
    }),
    prisma.review.groupBy({
      by: ["physical_book_id"],
      where: { physical_book_id: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }],
      take: limit,
    }),
  ]);

  const ids = Array.from(
    new Set([
      ...mostRented.map((r) => r.book_id),
      ...topRated.map((r) => r.physical_book_id).filter(Boolean),
    ]),
  );

  const books = await prisma.book.findMany({
    where: { id: { in: ids }, deleted_at: null },
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      available: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const map = Object.fromEntries(books.map((b) => [b.id, b]));

  const trending = mostRented
    .slice(0, 3)
    .map((row) => ({
      book: map[row.book_id],
      rentalCount: row._count.book_id,
    }))
    .filter((item) => item.book);

  const topRatedBooks = topRated
    .slice(0, 5)
    .map((row) => ({
      book: map[row.physical_book_id || ""],
      avgRating: Number(Number(row._avg.rating || 0).toFixed(2)),
      reviewCount: row._count.rating,
    }))
    .filter((item) => item.book);

  console.log(trending);

  return {
    trending,
    mostRented: trending,
    topRated: topRatedBooks,
  };
};
