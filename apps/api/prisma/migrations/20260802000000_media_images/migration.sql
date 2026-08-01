-- AlterTable
ALTER TABLE "pastoral_areas" ADD COLUMN "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);
