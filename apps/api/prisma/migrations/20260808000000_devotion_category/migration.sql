-- AlterTable
ALTER TABLE "devotion_notes" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'DEVOTION';

-- CreateIndex
CREATE INDEX "devotion_notes_authorId_category_idx" ON "devotion_notes"("authorId", "category");
