-- AlterTable
ALTER TABLE "articles" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from coverUrl
UPDATE "articles"
SET "imageUrls" = ARRAY["coverUrl"]
WHERE "coverUrl" IS NOT NULL AND "coverUrl" <> '' AND cardinality("imageUrls") = 0;

-- AlterTable
ALTER TABLE "small_groups" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from photoUrl
UPDATE "small_groups"
SET "imageUrls" = ARRAY["photoUrl"]
WHERE "photoUrl" IS NOT NULL AND "photoUrl" <> '' AND cardinality("imageUrls") = 0;
