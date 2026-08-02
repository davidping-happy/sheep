-- AlterTable
ALTER TABLE "events" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "events" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
