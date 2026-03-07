/*
  Warnings:

  - A unique constraint covering the columns `[isbn]` on the table `Book` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,physical_book_id]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,digital_book_id]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,physical_book_id]` on the table `Wishlist` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,digital_book_id]` on the table `Wishlist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('QUEUED', 'NOTIFIED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "InventoryAlertType" AS ENUM ('LOW_STOCK', 'EXTENDED_OVERDUE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION';
ALTER TYPE "NotificationType" ADD VALUE 'WISHLIST';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_BOOK';
ALTER TYPE "NotificationType" ADD VALUE 'OVERDUE';

-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'OVERDUE';

-- AlterTable
ALTER TABLE "Author" ALTER COLUMN "image" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "publication_year" INTEGER,
ADD COLUMN     "publisher" TEXT;

-- AlterTable
ALTER TABLE "DigitalBook" ADD COLUMN     "publication_year" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "copy_id" UUID;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "low_stock_threshold" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "reservation_window_hr" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "queue_position" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'QUEUED',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCopy" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "copy_code" TEXT NOT NULL,
    "condition" "BookCondition" NOT NULL DEFAULT 'GOOD',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_condition_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "BookCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "type" "InventoryAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "threshold" INTEGER,
    "current_available" INTEGER,
    "message" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" UUID,

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActivityLog" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_user_id_status_idx" ON "Reservation"("user_id", "status");

-- CreateIndex
CREATE INDEX "Reservation_book_id_status_reserved_at_idx" ON "Reservation"("book_id", "status", "reserved_at");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_book_id_queue_position_key" ON "Reservation"("book_id", "queue_position");

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_copy_code_key" ON "BookCopy"("copy_code");

-- CreateIndex
CREATE INDEX "BookCopy_book_id_condition_idx" ON "BookCopy"("book_id", "condition");

-- CreateIndex
CREATE INDEX "BookCopy_book_id_is_available_idx" ON "BookCopy"("book_id", "is_available");

-- CreateIndex
CREATE INDEX "InventoryAlert_book_id_is_resolved_idx" ON "InventoryAlert"("book_id", "is_resolved");

-- CreateIndex
CREATE INDEX "InventoryAlert_type_created_at_idx" ON "InventoryAlert"("type", "created_at");

-- CreateIndex
CREATE INDEX "AdminActivityLog_admin_user_id_created_at_idx" ON "AdminActivityLog"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "AdminActivityLog_entity_type_entity_id_idx" ON "AdminActivityLog"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");

-- CreateIndex
CREATE INDEX "Book_author_id_idx" ON "Book"("author_id");

-- CreateIndex
CREATE INDEX "Book_category_id_idx" ON "Book"("category_id");

-- CreateIndex
CREATE INDEX "Book_available_idx" ON "Book"("available");

-- CreateIndex
CREATE INDEX "Book_deleted_at_idx" ON "Book"("deleted_at");

-- CreateIndex
CREATE INDEX "Book_publication_year_idx" ON "Book"("publication_year");

-- CreateIndex
CREATE INDEX "BookImage_physical_book_id_sort_order_idx" ON "BookImage"("physical_book_id", "sort_order");

-- CreateIndex
CREATE INDEX "BookImage_digital_book_id_sort_order_idx" ON "BookImage"("digital_book_id", "sort_order");

-- CreateIndex
CREATE INDEX "DigitalBook_author_id_idx" ON "DigitalBook"("author_id");

-- CreateIndex
CREATE INDEX "DigitalBook_category_id_idx" ON "DigitalBook"("category_id");

-- CreateIndex
CREATE INDEX "DigitalBook_deleted_at_idx" ON "DigitalBook"("deleted_at");

-- CreateIndex
CREATE INDEX "DigitalBook_publication_year_idx" ON "DigitalBook"("publication_year");

-- CreateIndex
CREATE INDEX "Notification_user_id_is_read_idx" ON "Notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE INDEX "Payment_status_paid_at_idx" ON "Payment"("status", "paid_at");

-- CreateIndex
CREATE INDEX "Rental_user_id_status_idx" ON "Rental"("user_id", "status");

-- CreateIndex
CREATE INDEX "Rental_book_id_status_idx" ON "Rental"("book_id", "status");

-- CreateIndex
CREATE INDEX "Rental_status_due_date_idx" ON "Rental"("status", "due_date");

-- CreateIndex
CREATE INDEX "Rental_loan_date_idx" ON "Rental"("loan_date");

-- CreateIndex
CREATE INDEX "Review_physical_book_id_created_at_idx" ON "Review"("physical_book_id", "created_at");

-- CreateIndex
CREATE INDEX "Review_digital_book_id_created_at_idx" ON "Review"("digital_book_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Review_user_id_physical_book_id_key" ON "Review"("user_id", "physical_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "Review_user_id_digital_book_id_key" ON "Review"("user_id", "digital_book_id");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_is_blocked_idx" ON "User"("is_blocked");

-- CreateIndex
CREATE INDEX "Wishlist_user_id_created_at_idx" ON "Wishlist"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_user_id_physical_book_id_key" ON "Wishlist"("user_id", "physical_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_user_id_digital_book_id_key" ON "Wishlist"("user_id", "digital_book_id");

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "BookCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCopy" ADD CONSTRAINT "BookCopy_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActivityLog" ADD CONSTRAINT "AdminActivityLog_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
