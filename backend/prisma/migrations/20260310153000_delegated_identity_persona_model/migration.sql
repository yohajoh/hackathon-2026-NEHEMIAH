-- Delegated identity model: user can hold ADMIN and STUDENT roles,
-- with a single persistent identity and optional student profile.

CREATE TABLE IF NOT EXISTS "StudentProfile" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "student_number" TEXT,
  "year" TEXT,
  "department" TEXT,
  "phone" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_user_id_key" ON "StudentProfile"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_student_number_key" ON "StudentProfile"("student_number");
CREATE INDEX IF NOT EXISTS "StudentProfile_student_number_idx" ON "StudentProfile"("student_number");

CREATE TABLE IF NOT EXISTS "UserRoleAssignment" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "Role" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserRoleAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRoleAssignment_user_id_role_key" ON "UserRoleAssignment"("user_id", "role");
CREATE INDEX IF NOT EXISTS "UserRoleAssignment_role_idx" ON "UserRoleAssignment"("role");

ALTER TABLE "Rental"
ADD COLUMN IF NOT EXISTS "actor_user_id" UUID,
ADD COLUMN IF NOT EXISTS "student_profile_id" UUID;

ALTER TABLE "Reservation"
ADD COLUMN IF NOT EXISTS "actor_user_id" UUID,
ADD COLUMN IF NOT EXISTS "student_profile_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Rental_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "Rental"
    ADD CONSTRAINT "Rental_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Rental_student_profile_id_fkey'
  ) THEN
    ALTER TABLE "Rental"
    ADD CONSTRAINT "Rental_student_profile_id_fkey"
    FOREIGN KEY ("student_profile_id") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_student_profile_id_fkey'
  ) THEN
    ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_student_profile_id_fkey"
    FOREIGN KEY ("student_profile_id") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Rental_actor_user_id_idx" ON "Rental"("actor_user_id");
CREATE INDEX IF NOT EXISTS "Rental_student_profile_id_idx" ON "Rental"("student_profile_id");
CREATE INDEX IF NOT EXISTS "Reservation_actor_user_id_idx" ON "Reservation"("actor_user_id");
CREATE INDEX IF NOT EXISTS "Reservation_student_profile_id_idx" ON "Reservation"("student_profile_id");

-- Seed role assignment from legacy single-role field.
INSERT INTO "UserRoleAssignment" ("id", "user_id", "role", "created_at")
SELECT gen_random_uuid(), u."id", u."role", CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "UserRoleAssignment" ura
  WHERE ura."user_id" = u."id" AND ura."role" = u."role"
);

-- Create a student profile for users with student-facing data.
INSERT INTO "StudentProfile" (
  "id",
  "user_id",
  "student_number",
  "year",
  "department",
  "phone",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  u."id",
  u."student_id",
  u."year",
  u."department",
  u."phone",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE
  (u."role" = 'STUDENT' OR u."student_id" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "StudentProfile" sp WHERE sp."user_id" = u."id"
  );

-- Backfill actor as the current user for existing records.
UPDATE "Rental" SET "actor_user_id" = "user_id" WHERE "actor_user_id" IS NULL;
UPDATE "Reservation" SET "actor_user_id" = "user_id" WHERE "actor_user_id" IS NULL;

-- Backfill student profile ownership for existing rental/reservation rows.
UPDATE "Rental" r
SET "student_profile_id" = sp."id"
FROM "StudentProfile" sp
WHERE sp."user_id" = r."user_id" AND r."student_profile_id" IS NULL;

UPDATE "Reservation" r
SET "student_profile_id" = sp."id"
FROM "StudentProfile" sp
WHERE sp."user_id" = r."user_id" AND r."student_profile_id" IS NULL;

-- Remove old impersonation columns.
ALTER TABLE "Rental" DROP CONSTRAINT IF EXISTS "Rental_impersonated_by_admin_id_fkey";
ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_impersonated_by_admin_id_fkey";
DROP INDEX IF EXISTS "Rental_impersonated_by_admin_id_idx";
DROP INDEX IF EXISTS "Reservation_impersonated_by_admin_id_idx";
ALTER TABLE "Rental" DROP COLUMN IF EXISTS "impersonated_by_admin_id";
ALTER TABLE "Reservation" DROP COLUMN IF EXISTS "impersonated_by_admin_id";
