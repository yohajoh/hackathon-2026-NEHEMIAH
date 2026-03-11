-- Book-level loan/pricing and payment context/debt tracking

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentContext') THEN
    CREATE TYPE "PaymentContext" AS ENUM ('BORROW', 'FINE');
  END IF;
END $$;

ALTER TABLE "Book"
  ADD COLUMN IF NOT EXISTS "loan_duration_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "rental_price" DECIMAL NOT NULL DEFAULT 10;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "context" "PaymentContext" NOT NULL DEFAULT 'FINE',
  ADD COLUMN IF NOT EXISTS "rental_charge" DECIMAL,
  ADD COLUMN IF NOT EXISTS "debt_amount" DECIMAL,
  ADD COLUMN IF NOT EXISTS "debt_rental_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
