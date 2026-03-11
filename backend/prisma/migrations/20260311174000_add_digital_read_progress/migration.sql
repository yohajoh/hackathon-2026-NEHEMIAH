CREATE TABLE IF NOT EXISTS "DigitalReadProgress" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "digital_book_id" UUID NOT NULL,
  "first_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "DigitalReadProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DigitalReadProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DigitalReadProgress_digital_book_id_fkey" FOREIGN KEY ("digital_book_id") REFERENCES "DigitalBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalReadProgress_user_id_digital_book_id_key"
  ON "DigitalReadProgress"("user_id", "digital_book_id");

CREATE INDEX IF NOT EXISTS "DigitalReadProgress_digital_book_id_last_read_at_idx"
  ON "DigitalReadProgress"("digital_book_id", "last_read_at");
