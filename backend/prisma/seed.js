import { prisma } from "../src/prisma.js";
import { hashPassword } from "../src/utils/password.utils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PLACEHOLDER_COVER = "https://placehold.co/400x600?text=Brana+Book";
const SEED_COUNT = 10;

async function clearDatabase() {
  await prisma.adminActivityLog.deleteMany();
  await prisma.inventoryAlert.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.bookImage.deleteMany();
  await prisma.bookCopy.deleteMany();
  await prisma.book.deleteMany();
  await prisma.digitalBook.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.pendingSignup.deleteMany();
  await prisma.author.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log(`Seeding database with ${SEED_COUNT} records per table...`);
  await clearDatabase();

  const hashedPassword = await hashPassword("password123");

  const users = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const isAdmin = i < 2;
    const user = await prisma.user.create({
      data: {
        id: i === 0 ? "db212f22-6707-4acd-8b95-0609db003ae1" : undefined,
        name: isAdmin ? `Admin ${i + 1}` : `Student ${i + 1}`,
        email: isAdmin
          ? i === 0
            ? "ybelete490@gmail.com"
            : `admin${i + 1}@brana.local`
          : `student${i + 1}@astu.edu.et`,
        student_id: isAdmin ? null : `ASTU/${String(100 + i)}/14`,
        phone: `+251900000${String(i).padStart(3, "0")}`,
        year: isAdmin ? null : `${(i % 4) + 1}`,
        department: isAdmin ? "Library" : ["Engineering", "CS", "Business", "Theology"][i % 4],
        password_hash: hashedPassword,
        role: isAdmin ? "ADMIN" : "STUDENT",
        is_confirmed: true,
        is_blocked: i === 9,
      },
    });
    users.push(user);
  }

  const pendingSignups = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    pendingSignups.push(
      await prisma.pendingSignup.create({
        data: {
          name: `Pending User ${i + 1}`,
          email: `pending${i + 1}@astu.edu.et`,
          password_hash: hashedPassword,
          confirmation_token: `confirm-token-${i + 1}-${Date.now()}`,
        },
      }),
    );
  }

  const categoryNames = [
    "Theology",
    "Discipleship",
    "Leadership",
    "Evangelism",
    "Prayer",
    "History",
    "Technology",
    "Business",
    "Finance",
    "Literature",
  ];
  const categories = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    categories.push(
      await prisma.category.create({
        data: {
          name: categoryNames[i],
          slug: categoryNames[i].toLowerCase().replace(/\s+/g, "-"),
        },
      }),
    );
  }

  const authors = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    authors.push(
      await prisma.author.create({
        data: {
          name: `Author ${i + 1}`,
          bio: `Biography of Author ${i + 1}. Known for impactful writing in community learning.`,
          image: `https://placehold.co/200x200?text=Author+${i + 1}`,
        },
      }),
    );
  }

  const books = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const copies = 3 + (i % 4);
    const borrowed = i % 3;
    books.push(
      await prisma.book.create({
        data: {
          title: `Physical Book ${i + 1}`,
          author_id: authors[i].id,
          category_id: categories[i].id,
          description: `Physical catalog entry ${i + 1} for Brana library.`,
          cover_image_url: PLACEHOLDER_COVER,
          copies,
          available: Math.max(0, copies - borrowed),
          pages: 140 + i * 15,
          publication_year: 2010 + i,
          publisher: `Publisher ${i + 1}`,
          language: "English",
          isbn: `9780000000${String(i).padStart(3, "0")}`,
        },
      }),
    );
  }

  const digitalBooks = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    digitalBooks.push(
      await prisma.digitalBook.create({
        data: {
          title: `Digital Book ${i + 1}`,
          author_id: authors[i].id,
          category_id: categories[i].id,
          description: `Digital edition ${i + 1} with searchable text.`,
          cover_image_url: PLACEHOLDER_COVER,
          pdf_file: Buffer.from(`PDF content for digital book ${i + 1}`),
          pdf_name: `digital-book-${i + 1}.pdf`,
          pdf_access: i % 3 === 0 ? "PAID" : i % 2 === 0 ? "RESTRICTED" : "FREE",
          pages: 100 + i * 10,
          publication_year: 2012 + i,
        },
      }),
    );
  }

  const bookCopies = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    bookCopies.push(
      await prisma.bookCopy.create({
        data: {
          book_id: books[i].id,
          copy_code: `BC-${String(i + 1).padStart(4, "0")}`,
          condition: ["NEW", "GOOD", "WORN", "DAMAGED", "LOST"][i % 5],
          is_available: i % 3 !== 0,
          notes: `Condition note for copy ${i + 1}`,
          acquired_at: new Date(Date.now() - (i + 30) * DAY_MS),
          last_condition_update: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  const reservations = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const reservedAt = new Date(Date.now() - i * DAY_MS);
    const status = ["QUEUED", "NOTIFIED", "FULFILLED", "EXPIRED", "CANCELLED"][i % 5];
    reservations.push(
      await prisma.reservation.create({
        data: {
          user_id: users[(i % 8) + 2].id,
          book_id: books[i].id,
          queue_position: 1,
          status,
          reserved_at: reservedAt,
          notified_at: status === "NOTIFIED" || status === "FULFILLED" ? new Date(reservedAt.getTime() + DAY_MS) : null,
          expires_at: status === "NOTIFIED" || status === "EXPIRED" ? new Date(reservedAt.getTime() + 2 * DAY_MS) : null,
          fulfilled_at: status === "FULFILLED" ? new Date(reservedAt.getTime() + 2 * DAY_MS) : null,
          cancelled_at: status === "CANCELLED" ? new Date(reservedAt.getTime() + DAY_MS) : null,
        },
      }),
    );
  }

  const rentals = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const loanDate = new Date(Date.now() - (i + 7) * DAY_MS);
    const dueDate = new Date(loanDate.getTime() + 7 * DAY_MS);
    const status = ["BORROWED", "PENDING", "RETURNED", "COMPLETED", "OVERDUE"][i % 5];
    const returned = status === "RETURNED" || status === "COMPLETED" || status === "PENDING";

    rentals.push(
      await prisma.rental.create({
        data: {
          user_id: users[(i % 8) + 2].id,
          book_id: books[i].id,
          copy_id: bookCopies[i].id,
          loan_date: loanDate,
          due_date: dueDate,
          return_date: returned ? new Date(dueDate.getTime() + (i % 3) * DAY_MS) : null,
          status,
          fine: status === "PENDING" || status === "OVERDUE" ? (i + 1) * 5 : null,
        },
      }),
    );
  }

  const payments = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    payments.push(
      await prisma.payment.create({
        data: {
          rental_id: rentals[i].id,
          tx_ref: `TX-${Date.now()}-${i + 1}`,
          amount: i % 2 === 0 ? 0 : (i + 1) * 5,
          method: i % 2 === 0 ? "CASH" : "CHAPA",
          status: i % 3 === 0 ? "PENDING" : i % 3 === 1 ? "SUCCESS" : "FAILED",
          paid_at: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  const reviews = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const isPhysical = i < 5;
    reviews.push(
      await prisma.review.create({
        data: {
          user_id: users[i].id,
          physical_book_id: isPhysical ? books[i].id : null,
          digital_book_id: isPhysical ? null : digitalBooks[i].id,
          book_type: isPhysical ? "PHYSICAL" : "DIGITAL",
          rating: (i % 5) + 1,
          comment: `Review ${i + 1}: helpful resource for students.`,
          created_at: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  const wishlists = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const isPhysical = i < 5;
    wishlists.push(
      await prisma.wishlist.create({
        data: {
          user_id: users[(i % 8) + 2].id,
          physical_book_id: isPhysical ? books[i].id : null,
          digital_book_id: isPhysical ? null : digitalBooks[i].id,
          book_type: isPhysical ? "PHYSICAL" : "DIGITAL",
          created_at: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  const bookImages = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const isPhysical = i < 5;
    bookImages.push(
      await prisma.bookImage.create({
        data: {
          book_id: isPhysical ? books[i].id : digitalBooks[i].id,
          book_type: isPhysical ? "PHYSICAL" : "DIGITAL",
          image_url: `https://placehold.co/600x800?text=Cover+${i + 1}`,
          sort_order: i + 1,
          physical_book_id: isPhysical ? books[i].id : null,
          digital_book_id: isPhysical ? null : digitalBooks[i].id,
        },
      }),
    );
  }

  const notifications = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    notifications.push(
      await prisma.notification.create({
        data: {
          user_id: users[i].id,
          message: `Notification ${i + 1}: system event update.`,
          type: ["INFO", "ALERT", "SYSTEM", "REMINDER", "OVERDUE"][i % 5],
          is_read: i % 2 === 0,
          created_at: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  const inventoryAlerts = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const resolved = i % 2 === 0;
    inventoryAlerts.push(
      await prisma.inventoryAlert.create({
        data: {
          book_id: books[i].id,
          type: i % 2 === 0 ? "LOW_STOCK" : "EXTENDED_OVERDUE",
          severity: ["LOW", "MEDIUM", "HIGH"][i % 3],
          threshold: 2,
          current_available: books[i].available,
          message: `Alert ${i + 1}: inventory attention required.`,
          is_resolved: resolved,
          created_at: new Date(Date.now() - i * DAY_MS),
          resolved_at: resolved ? new Date(Date.now() - (i - 1) * DAY_MS) : null,
          resolved_by_user_id: resolved ? users[0].id : null,
        },
      }),
    );
  }

  const adminActivityLogs = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    adminActivityLogs.push(
      await prisma.adminActivityLog.create({
        data: {
          admin_user_id: users[i % 2].id,
          action: ["CREATE_BOOK", "UPDATE_BOOK", "RETURN_BOOK", "CONFIG_UPDATE", "BLOCK_USER"][i % 5],
          entity_type: ["Book", "Rental", "User", "SystemConfig", "Category"][i % 5],
          entity_id: [books[i].id, rentals[i].id, users[i].id, null, categories[i].id][i % 5],
          description: `Admin activity log ${i + 1}`,
          metadata: { source: "seed", index: i + 1 },
          ip_address: `192.168.1.${100 + i}`,
          user_agent: "Brana Seed Script",
          created_at: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  const systemConfigs = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    systemConfigs.push(
      await prisma.systemConfig.create({
        data: {
          max_loan_days: 7 + i,
          daily_fine: 2 + i,
          max_books_per_user: 2 + (i % 4),
          reservation_window_hr: 24 + i,
          low_stock_threshold: 1 + (i % 3),
          enable_notifications: i % 2 === 0,
          last_updated_by_id: users[i % 2].id,
          created_at: new Date(Date.now() - i * DAY_MS),
        },
      }),
    );
  }

  console.log("Seed complete.");
  console.table({
    users: users.length,
    pendingSignups: pendingSignups.length,
    categories: categories.length,
    authors: authors.length,
    books: books.length,
    digitalBooks: digitalBooks.length,
    bookCopies: bookCopies.length,
    reservations: reservations.length,
    rentals: rentals.length,
    payments: payments.length,
    reviews: reviews.length,
    wishlists: wishlists.length,
    bookImages: bookImages.length,
    notifications: notifications.length,
    inventoryAlerts: inventoryAlerts.length,
    adminActivityLogs: adminActivityLogs.length,
    systemConfigs: systemConfigs.length,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
