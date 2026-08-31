-- CreateTable
CREATE TABLE "devotion_likes" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotion_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devotion_comments" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devotion_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devotion_notes_visibility_noteDate_idx" ON "devotion_notes"("visibility", "noteDate");

-- CreateIndex
CREATE INDEX "devotion_likes_noteId_idx" ON "devotion_likes"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "devotion_likes_noteId_userId_key" ON "devotion_likes"("noteId", "userId");

-- CreateIndex
CREATE INDEX "devotion_comments_noteId_createdAt_idx" ON "devotion_comments"("noteId", "createdAt");

-- AddForeignKey
ALTER TABLE "devotion_likes" ADD CONSTRAINT "devotion_likes_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "devotion_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devotion_likes" ADD CONSTRAINT "devotion_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devotion_comments" ADD CONSTRAINT "devotion_comments_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "devotion_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devotion_comments" ADD CONSTRAINT "devotion_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
