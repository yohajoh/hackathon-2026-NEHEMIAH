import { prisma } from "../src/prisma.js";

async function main() {
  console.log("🚀 Starting database seed with specific User ID...");

  // 1. CLEANUP
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.bookImage.deleteMany();
  await prisma.book.deleteMany();
  await prisma.digitalBook.deleteMany();
  await prisma.author.deleteMany();
  await prisma.category.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.pendingSignup.deleteMany();
  await prisma.user.deleteMany();

  // 2. AUTHORS (10)
  const authors = await Promise.all([
    prisma.author.create({ data: { name: "Haddis Alemayehu", bio: "Famous for Ethiopian classics.", image: "https://placehold.co/200x200?text=Author1" } }),
    prisma.author.create({ data: { name: "Robert Kiyosaki", bio: "Financial literacy expert.", image: "https://placehold.co/200x200?text=Author2" } }),
    prisma.author.create({ data: { name: "Simon Sinek", bio: "Leadership strategist.", image: "https://placehold.co/200x200?text=Author3" } }),
    prisma.author.create({ data: { name: "J.K. Rowling", bio: "Fantasy world creator.", image: "https://placehold.co/200x200?text=Author4" } }),
    prisma.author.create({ data: { name: "Abraham Gebre", bio: "ASTU Academic Researcher.", image: "https://placehold.co/200x200?text=Author5" } }),
    prisma.author.create({ data: { name: "Dale Carnegie", bio: "Self-improvement pioneer.", image: "https://placehold.co/200x200?text=Author6" } }),
    prisma.author.create({ data: { name: "Malcolm Gladwell", bio: "Social science author.", image: "https://placehold.co/200x200?text=Author7" } }),
    prisma.author.create({ data: { name: "James Clear", bio: "Habit formation expert.", image: "https://placehold.co/200x200?text=Author8" } }),
    prisma.author.create({ data: { name: "Tsegaye Gebre-Medhin", bio: "Poet Laureate of Ethiopia.", image: "https://placehold.co/200x200?text=Author9" } }),
    prisma.author.create({ data: { name: "Martin Fowler", bio: "Software architecture expert.", image: "https://placehold.co/200x200?text=Author10" } }),
  ]);

  // 3. CATEGORIES (10)
  const categories = await Promise.all([
    "Fiction", "Finance", "Technology", "Self-Help", "History", 
    "Science", "Literature", "Biography", "Philosophy", "Business"
  ].map(name => prisma.category.create({ 
    data: { name, slug: name.toLowerCase().replace(/ /g, '-') } 
  })));

  // 4. USERS (10) - Using your specific ID for the first user
  const users = await Promise.all([
    // YOUR ACCOUNT
    prisma.user.create({
      data: {
        id: "db212f22-6707-4acd-8b95-0609db003ae1",
        name: "Yohannes Belete",
        email: "ybelete490@gmail.com",
        student_id: "ASTU/001/14",
        password_hash: "hashed_pass_123", // Update this with your actual hash if needed
        role: "ADMIN",
        is_confirmed: true
      }
    }),
    // 9 other students
    ...Array.from({ length: 9 }).map((_, i) => 
      prisma.user.create({
        data: {
          name: `Student ${i + 2}`,
          email: `student${i + 2}@astu.edu.et`,
          student_id: `ASTU/${102 + i}/14`,
          password_hash: "hashed_pass_123",
          role: "STUDENT",
          is_confirmed: true
        }
      })
    )
  ]);

  // 5. PHYSICAL BOOKS (10)
  const books = await Promise.all(Array.from({ length: 10 }).map((_, i) => 
    prisma.book.create({
      data: {
        title: `Brana Physical Collection ${i + 1}`,
        author_id: authors[i % 10].id,
        category_id: categories[i % 10].id,
        description: "Core physical text available at ASTU library.",
        cover_image_url: "https://placehold.co/400x600",
        copies: 5,
        available: 5,
        pages: 250 + (i * 10)
      }
    })
  ));

  // 6. DIGITAL BOOKS (10)
  const digitalBooks = await Promise.all(Array.from({ length: 10 }).map((_, i) => 
    prisma.digitalBook.create({
      data: {
        title: `Digital Resource ${i + 1}`,
        author_id: authors[i % 10].id,
        category_id: categories[i % 10].id,
        description: "E-book for instant reading.",
        cover_image_url: "https://placehold.co/400x600",
        pdf_file: Buffer.from("dummy_content"),
        pdf_name: `resource_${i}.pdf`,
        pdf_access: i % 2 === 0 ? "FREE" : "PAID",
        pages: 100 + (i * 5)
      }
    })
  ));

  // 7. RENTALS (10) - Linked to your User ID
  const rentals = await Promise.all(Array.from({ length: 10 }).map((_, i) => 
    prisma.rental.create({
      data: {
        user_id: users[i % users.length].id, // This ensures some are linked to you
        book_id: books[i].id,
        due_date: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)),
        status: "BORROWED"
      }
    })
  ));

  // 8. PAYMENTS (10)
  await Promise.all(rentals.map((rental, i) => 
    prisma.payment.create({
      data: {
        rental_id: rental.id,
        tx_ref: `REF-${Date.now()}-${i}`,
        amount: 0.00,
        method: i % 2 === 0 ? "CASH" : "CHAPA",
        status: "SUCCESS"
      }
    })
  ));

  // 9. REVIEWS (10)
  await Promise.all(Array.from({ length: 10 }).map((_, i) => 
    prisma.review.create({
      data: {
        user_id: users[0].id, // All reviews by you for testing
        physical_book_id: i < 5 ? books[i].id : null,
        digital_book_id: i >= 5 ? digitalBooks[i].id : null,
        book_type: i < 5 ? "PHYSICAL" : "DIGITAL",
        rating: 5,
        comment: "Highly recommended for engineering students."
      }
    })
  ));

  // 10. WISHLIST (10)
  await Promise.all(Array.from({ length: 10 }).map((_, i) => 
    prisma.wishlist.create({
      data: {
        user_id: users[0].id, // Wishlist items for your account
        digital_book_id: digitalBooks[i].id,
        book_type: "DIGITAL"
      }
    })
  ));

  // 11. NOTIFICATIONS (10)
  await Promise.all(Array.from({ length: 10 }).map((_, i) => 
    prisma.notification.create({
      data: {
        user_id: users[0].id, // Notifications in your inbox
        message: `System Alert: Your rental for book ${i+1} is active.`,
        type: i % 2 === 0 ? "INFO" : "ALERT"
      }
    })
  ));

  // 12. SYSTEM CONFIG
  await prisma.systemConfig.create({
    data: {
      max_loan_days: 14,
      daily_fine: 5.00,
      max_books_per_user: 3,
      enable_notifications: true,
      last_updated_by_id: users[0].id,
    }
  });

  console.log("✅ Seed complete. User 'ybelete490@gmail.com' is now the primary data owner.");
}

main()
  .catch((e) => { console.error("❌ Seed failure:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });