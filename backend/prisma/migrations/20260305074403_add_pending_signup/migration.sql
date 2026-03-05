/*
  Warnings:

  - Added the required column `pages` to the `Book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pages` to the `DigitalBook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "pages" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "DigitalBook" ADD COLUMN     "pages" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "PendingSignup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "confirmation_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSignup_confirmation_token_key" ON "PendingSignup"("confirmation_token");
