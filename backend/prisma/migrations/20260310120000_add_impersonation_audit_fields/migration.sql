-- Add impersonation audit trail fields for borrow/reserve records
ALTER TABLE "Rental"
ADD COLUMN IF NOT EXISTS "impersonated_by_admin_id" UUID;

ALTER TABLE "Reservation"
ADD COLUMN IF NOT EXISTS "impersonated_by_admin_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Rental_impersonated_by_admin_id_fkey'
  ) THEN
    ALTER TABLE "Rental"
    ADD CONSTRAINT "Rental_impersonated_by_admin_id_fkey"
    FOREIGN KEY ("impersonated_by_admin_id") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Reservation_impersonated_by_admin_id_fkey'
  ) THEN
    ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_impersonated_by_admin_id_fkey"
    FOREIGN KEY ("impersonated_by_admin_id") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Rental_impersonated_by_admin_id_idx"
ON "Rental"("impersonated_by_admin_id");

CREATE INDEX IF NOT EXISTS "Reservation_impersonated_by_admin_id_idx"
ON "Reservation"("impersonated_by_admin_id");
