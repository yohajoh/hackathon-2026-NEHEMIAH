/**
 * Admin Statistics Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive analytics for the admin dashboard:
 *   - Overview: users, books, rentals, revenue KPIs
 *   - Books: top rated, most borrowed, least available (stock alerts)
 *   - Users: most active, new registrations, blocked count
 *   - Rentals: active, overdue, completion rate, time-series chart
 *   - Revenue: total, by method, by month (time-series)
 *   - Notifications: unread count for admin badge
 */

import { prisma } from "../prisma.js";

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW / KPI DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick KPIs for top section of admin dashboard.
 * Returns aggregated counts and sums.
 */
export const getOverviewStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  );

  const [
    totalUsers,
    newUsersThisMonth,
    blockedUsers,
    totalPhysicalBooks,
    totalDigitalBooks,
    availableBooks,
    outOfStockBooks,
    totalAuthors,
    totalCategories,
    activeRentals,
    overdueRentals,
    pendingRequests,
    pendingReturns,
    completedRentals,
    finesThisMonth,
    finesLastMonth,
    pendingFines,
    unreadNotifications,
    totalReviews,
    mostBorrowed,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({
      where: { role: "STUDENT", created_at: { gte: startOfMonth } },
    }),
    prisma.user.count({ where: { is_blocked: true } }),
    prisma.book.count({ where: { deleted_at: null } }),
    prisma.digitalBook.count({ where: { deleted_at: null } }),
    prisma.book.count({ where: { deleted_at: null, available: { gt: 0 } } }),
    prisma.book.count({ where: { deleted_at: null, available: 0 } }),
    prisma.author.count(),
    prisma.category.count(),
    prisma.rental.count({ where: /** @type {any} */ ({ status: "BORROWED" }) }),
    prisma.rental.count({
      where: /** @type {any} */ ({ status: "BORROWED", due_date: { lt: now } }),
    }),
    prisma.rental.count({ where: /** @type {any} */ ({ status: "PENDING" }) }),
    prisma.rental.count({ where: /** @type {any} */ ({ status: "RETURNED" }) }),
    prisma.rental.count({
      where: /** @type {any} */ ({ status: "COMPLETED" }),
    }),
    // Revenue this month
    prisma.payment.aggregate({
      where: { status: "SUCCESS", paid_at: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Revenue last month
    prisma.payment.aggregate({
      where: {
        status: "SUCCESS",
        paid_at: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
    }),
    // Pending (unpaid) fines
    prisma.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Admin unread notifications count
    prisma.notification.count({
      where: { user: { role: "ADMIN" }, is_read: false },
    }),
    prisma.review.count(),
    // Get the single most borrowed book for the dashboard seasonal summary
    prisma.rental.groupBy({
      by: ["book_id"],
      _count: { book_id: true },
      orderBy: { _count: { book_id: "desc" } },
      take: 1,
    }),
  ]);

  const revenueThisMonth = Number(finesThisMonth._sum.amount ?? 0);
  const revenueLastMonth = Number(finesLastMonth._sum.amount ?? 0);
  const revenueGrowth =
    revenueLastMonth > 0
      ? parseFloat(
          (
            ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) *
            100
          ).toFixed(1),
        )
      : 0;

  // Resolve most borrowed book details if exists
  let mostBorrowedBook = null;
  if (mostBorrowed.length > 0) {
    mostBorrowedBook = await prisma.book.findUnique({
      where: { id: mostBorrowed[0].book_id },
      select: { title: true, author: { select: { name: true } } },
    });
  }

  return {
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth,
      blocked: blockedUsers,
    },
    books: {
      physical: totalPhysicalBooks,
      digital: totalDigitalBooks,
      total: totalPhysicalBooks + totalDigitalBooks,
      available: availableBooks,
      outOfStock: outOfStockBooks,
    },
    authors: totalAuthors,
    categories: totalCategories,
    rentals: {
      active: activeRentals,
      overdue: overdueRentals,
      pendingRequests,
      pendingReturns,
      completed: completedRentals,
    },
    revenue: {
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      growth: revenueGrowth,
      pendingFines: Number(pendingFines._sum.amount ?? 0),
      pendingCount: pendingFines._count.id,
      paidThisMonthCount: finesThisMonth._count.id,
    },
    notifications: {
      adminUnread: unreadNotifications,
    },
    reviews: {
      total: totalReviews,
    },
    topBook: mostBorrowedBook,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOKS ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getBooksStats = async () => {
  const [
    topRatedPhysical,
    topRatedDigital,
    mostBorrowedBooks,
    lowStockBooks,
    reviewDistribution,
  ] = await Promise.all([
    // Top 10 physical books by average rating
    prisma.review.groupBy({
      by: ["physical_book_id"],
      where: { physical_book_id: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 10,
    }),

    // Top 10 digital books by average rating
    prisma.review.groupBy({
      by: ["digital_book_id"],
      where: { digital_book_id: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 10,
    }),

    // 10 most borrowed physical books
    prisma.rental.groupBy({
      by: ["book_id"],
      _count: { book_id: true },
      orderBy: { _count: { book_id: "desc" } },
      take: 10,
    }),

    // Books with available < 2 (low stock warning)
    prisma.book.findMany({
      where: { deleted_at: null, available: { lte: 2 } },
      select: {
        id: true,
        title: true,
        available: true,
        copies: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { available: "asc" },
    }),

    // Overall review star distribution
    prisma.review.groupBy({
      by: ["rating"],
      _count: { rating: true },
      orderBy: { rating: "asc" },
    }),
  ]);

  // Resolve book IDs for top rated physical books
  const topRatedPhysicalIds = topRatedPhysical
    .filter((r) => r.physical_book_id)
    .map((r) => r.physical_book_id);

  const physicalBooksDetails = await prisma.book.findMany({
    where: { id: { in: /** @type {any} */ (topRatedPhysicalIds) } },
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      author: { select: { name: true } },
    },
  });

  const physicalMap = Object.fromEntries(
    physicalBooksDetails.map((b) => [b.id, b]),
  );

  // Resolve book IDs for top rated digital books
  const topRatedDigitalIds = topRatedDigital
    .filter((r) => r.digital_book_id)
    .map((r) => r.digital_book_id);

  const digitalBooksDetails = await prisma.digitalBook.findMany({
    where: { id: { in: /** @type {any} */ (topRatedDigitalIds) } },
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      author: { select: { name: true } },
    },
  });

  const digitalMap = Object.fromEntries(
    digitalBooksDetails.map((b) => [b.id, b]),
  );

  // Resolve most borrowed
  const borrowedBookIds = mostBorrowedBooks.map((r) => r.book_id);
  const borrowedDetails = await prisma.book.findMany({
    where: { id: { in: borrowedBookIds } },
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      author: { select: { name: true } },
    },
  });
  const borrowedMap = Object.fromEntries(borrowedDetails.map((b) => [b.id, b]));

  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviewDistribution.forEach((r) => {
    ratingDist[r.rating] = r._count.rating;
  });

  return {
    topRatedPhysical: topRatedPhysical.map((r) => ({
      book: physicalMap[r.physical_book_id || ""],
      avgRating: parseFloat(Number(r._avg.rating).toFixed(2)),
      reviewCount: r._count.rating,
    })),
    topRatedDigital: topRatedDigital.map((r) => ({
      book: digitalMap[r.digital_book_id || ""],
      avgRating: parseFloat(Number(r._avg.rating).toFixed(2)),
      reviewCount: r._count.rating,
    })),
    mostBorrowed: mostBorrowedBooks.map((r) => ({
      book: borrowedMap[r.book_id],
      borrowCount: r._count.book_id,
    })),
    lowStockBooks,
    reviewDistribution: ratingDist,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getUserStats = async () => {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [topBorrowers, recentUsers, blockedUsers, confirmedVsUnconfirmed] =
    await Promise.all([
      // Top 10 most active borrowers
      prisma.rental.groupBy({
        by: ["user_id"],
        _count: { user_id: true },
        orderBy: { _count: { user_id: "desc" } },
        take: 10,
      }),

      // Newest 10 students
      prisma.user.findMany({
        where: { role: "STUDENT", created_at: { gte: last30Days } },
        select: {
          id: true,
          name: true,
          email: true,
          student_id: true,
          created_at: true,
          is_confirmed: true,
        },
        orderBy: { created_at: "desc" },
        take: 10,
      }),

      // Blocked users
      prisma.user.findMany({
        where: { is_blocked: true },
        select: { id: true, name: true, email: true, student_id: true },
      }),

      // Confirmed vs unconfirmed
      prisma.user.groupBy({
        by: ["is_confirmed"],
        where: { role: "STUDENT" },
        _count: { is_confirmed: true },
      }),
    ]);

  // Resolve top borrower names
  const borrowerIds = topBorrowers.map((r) => r.user_id);
  const borrowerDetails = await prisma.user.findMany({
    where: { id: { in: borrowerIds } },
    select: { id: true, name: true, email: true, student_id: true },
  });
  const borrowerMap = Object.fromEntries(borrowerDetails.map((u) => [u.id, u]));

  const confirmedCount =
    confirmedVsUnconfirmed.find((r) => r.is_confirmed)?.["_count"]?.[
      "is_confirmed"
    ] ?? 0;
  const unconfirmedCount =
    confirmedVsUnconfirmed.find((r) => !r.is_confirmed)?.["_count"]?.[
      "is_confirmed"
    ] ?? 0;

  return {
    topBorrowers: topBorrowers.map((r) => ({
      user: borrowerMap[r.user_id],
      rentalCount: r._count.user_id,
    })),
    recentRegistrations: recentUsers,
    blockedUsers,
    confirmation: {
      confirmed: confirmedCount,
      unconfirmed: unconfirmedCount,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// RENTAL ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getRentalStats = async () => {
  const now = new Date();

  const [statusBreakdown, overdueCount, dailyBorrows] = await Promise.all([
    // Status breakdown
    prisma.rental.groupBy({
      by: ["status"],
      _count: { status: true },
    }),

    // Overdue count
    prisma.rental.count({
      where: /** @type {any} */ ({ status: "BORROWED", due_date: { lt: now } }),
    }),

    // Daily borrows for last 30 days (raw SQL for time-series)
    prisma.$queryRaw`
      SELECT
        DATE(loan_date) as date,
        COUNT(*)::int as count
      FROM "Rental"
      WHERE loan_date >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(loan_date)
      ORDER BY date ASC
    `,
  ]);

  const statusMap = statusBreakdown.reduce((acc, r) => {
    acc[r.status] = r._count.status;
    return acc;
  }, /** @type {Record<string,number>} */ ({}));

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const completionRate =
    total > 0
      ? parseFloat(
          (
            (((statusMap["COMPLETED"] ?? 0) + (statusMap["RETURNED"] ?? 0)) /
              total) *
            100
          ).toFixed(1),
        )
      : 0;

  return {
    byStatus: statusMap,
    overdueCount,
    completionRate,
    dailyTimeSeries: dailyBorrows,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getRevenueStats = async () => {
  const [methodBreakdown, monthlyRevenue, allTimeRevenue] = await Promise.all([
    // Revenue by payment method
    prisma.payment.groupBy({
      by: ["method"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Monthly revenue for last 12 months
    prisma.$queryRaw`
      SELECT
        TO_CHAR(paid_at, 'YYYY-MM') as month,
        SUM(amount)::float as total,
        COUNT(*)::int as count
      FROM "Payment"
      WHERE status = 'SUCCESS'
        AND paid_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
      ORDER BY month ASC
    `,

    // All-time revenue totals
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    allTime: {
      total: Number(allTimeRevenue._sum.amount ?? 0),
      count: allTimeRevenue._count.id,
    },
    byMethod: methodBreakdown.map((r) => ({
      method: r.method,
      total: Number(r._sum.amount ?? 0),
      count: r._count.id,
    })),
    monthlyTimeSeries: monthlyRevenue,
  };
};
