-- CreateTable
CREATE TABLE "prayer_comments" (
    "id" TEXT NOT NULL,
    "prayerRequestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "takenDownAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prayer_comments_prayerRequestId_createdAt_idx" ON "prayer_comments"("prayerRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "prayer_comments" ADD CONSTRAINT "prayer_comments_prayerRequestId_fkey" FOREIGN KEY ("prayerRequestId") REFERENCES "prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_comments" ADD CONSTRAINT "prayer_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
