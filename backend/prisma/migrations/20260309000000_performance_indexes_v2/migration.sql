-- Performance indexes for frequently queried fields

-- Notifications: Fast lookup by type and read status
CREATE INDEX IF NOT EXISTS "Notification_type_is_read_idx" ON "Notification"(type, "is_read");

-- Book: Full-text search optimization
CREATE INDEX IF NOT EXISTS "Book_title_idx" ON "Book"(title);
CREATE INDEX IF NOT EXISTS "Book_isbn_idx" ON "Book"(isbn) WHERE "isbn" IS NOT NULL;

-- DigitalBook: Full-text search optimization  
CREATE INDEX IF NOT EXISTS "DigitalBook_title_idx" ON "DigitalBook"(title);

-- Rental: Optimize user rental history queries
CREATE INDEX IF NOT EXISTS "Rental_user_status_idx" ON "Rental"("user_id", status);
CREATE INDEX IF NOT EXISTS "Rental_user_loan_idx" ON "Rental"("user_id", "loan_date" DESC);

-- Wishlist: Optimize user wishlist queries
CREATE INDEX IF NOT EXISTS "Wishlist_user_created_idx" ON "Wishlist"("user_id", "created_at" DESC);

-- Review: Optimize book review queries
CREATE INDEX IF NOT EXISTS "Review_physical_rating_idx" ON "Review"("physical_book_id", rating) WHERE "physical_book_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Review_digital_rating_idx" ON "Review"("digital_book_id", rating) WHERE "digital_book_id" IS NOT NULL;

-- Reservation: Optimize queue position lookups
CREATE INDEX IF NOT EXISTS "Reservation_book_status_idx" ON "Reservation"("book_id", status, "queue_position");

-- BookCopy: Optimize availability queries
CREATE INDEX IF NOT EXISTS "BookCopy_available_idx" ON "BookCopy"("book_id", "is_available") WHERE "deleted_at" IS NULL;

-- User: Optimize student_id lookups
CREATE INDEX IF NOT EXISTS "User_student_id_idx" ON "User"("student_id") WHERE "student_id" IS NOT NULL;

-- Composite index for book listing with filters
CREATE INDEX IF NOT EXISTS "Book_listing_idx" ON "Book"("deleted_at", "available", "category_id", "author_id") WHERE "deleted_at" IS NULL;
