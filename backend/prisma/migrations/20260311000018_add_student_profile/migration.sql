/*
  Warnings:

  - You are about to drop the column `actor_user_id` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the column `student_profile_id` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the column `actor_user_id` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `student_profile_id` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the `StudentProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserRoleAssignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Rental" DROP CONSTRAINT "Rental_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Rental" DROP CONSTRAINT "Rental_student_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_student_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "StudentProfile" DROP CONSTRAINT "StudentProfile_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserRoleAssignment" DROP CONSTRAINT "UserRoleAssignment_user_id_fkey";

-- DropIndex
DROP INDEX "Book_isbn_idx";

-- DropIndex
DROP INDEX "Book_listing_idx";

-- DropIndex
DROP INDEX "Book_tags_idx";

-- DropIndex
DROP INDEX "Book_title_idx";

-- DropIndex
DROP INDEX "Book_topics_idx";

-- DropIndex
DROP INDEX "BookCopy_available_idx";

-- DropIndex
DROP INDEX "DigitalBook_tags_idx";

-- DropIndex
DROP INDEX "DigitalBook_title_idx";

-- DropIndex
DROP INDEX "DigitalBook_topics_idx";

-- DropIndex
DROP INDEX "Notification_type_is_read_idx";

-- DropIndex
DROP INDEX "Rental_actor_user_id_idx";

-- DropIndex
DROP INDEX "Rental_student_profile_id_idx";

-- DropIndex
DROP INDEX "Rental_user_loan_idx";

-- DropIndex
DROP INDEX "Reservation_actor_user_id_idx";

-- DropIndex
DROP INDEX "Reservation_book_status_idx";

-- DropIndex
DROP INDEX "Reservation_student_profile_id_idx";

-- DropIndex
DROP INDEX "Review_digital_rating_idx";

-- DropIndex
DROP INDEX "Review_physical_rating_idx";

-- DropIndex
DROP INDEX "User_student_id_idx";

-- DropIndex
DROP INDEX "Wishlist_user_created_idx";

-- AlterTable
ALTER TABLE "Rental" DROP COLUMN "actor_user_id",
DROP COLUMN "student_profile_id";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "actor_user_id",
DROP COLUMN "student_profile_id";

-- DropTable
DROP TABLE "StudentProfile";

-- DropTable
DROP TABLE "UserRoleAssignment";
