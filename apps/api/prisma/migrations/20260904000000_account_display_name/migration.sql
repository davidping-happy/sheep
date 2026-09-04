-- AlterTable: email optional; displayName unique; phone unique
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Deduplicate displayName before unique (append short id if needed)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, "displayName"
    FROM users u
    WHERE EXISTS (
      SELECT 1 FROM users u2
      WHERE u2."displayName" = u."displayName" AND u2.id < u.id
    )
  LOOP
    UPDATE users SET "displayName" = r."displayName" || '_' || substr(r.id::text, 1, 4)
    WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_displayName_key" ON "users"("displayName");

-- Deduplicate phones (keep first)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM users u
    WHERE u.phone IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.phone = u.phone AND u2.id < u.id
    )
  LOOP
    UPDATE users SET phone = NULL WHERE id = r.id;
  END LOOP;
END $$;

DROP INDEX IF EXISTS "users_phone_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
