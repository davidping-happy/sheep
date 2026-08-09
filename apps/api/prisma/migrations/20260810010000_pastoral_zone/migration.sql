-- CreateTable
CREATE TABLE "pastoral_zones" (
    "id" TEXT NOT NULL,
    "pastoralAreaId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leaderName" TEXT NOT NULL DEFAULT '',
    "intro" TEXT,
    "photoUrl" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pastoral_zones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pastoral_zones" ADD CONSTRAINT "pastoral_zones_pastoralAreaId_fkey" FOREIGN KEY ("pastoralAreaId") REFERENCES "pastoral_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "pastoral_zones_pastoralAreaId_idx" ON "pastoral_zones"("pastoralAreaId");

-- AlterTable: add zone + leaderName on groups (nullable first for backfill)
ALTER TABLE "small_groups" ADD COLUMN "zoneId" TEXT;
ALTER TABLE "small_groups" ADD COLUMN "leaderName" TEXT;

-- Backfill: each pastoral area gets a default zone; attach existing groups
INSERT INTO "pastoral_zones" ("id", "pastoralAreaId", "code", "leaderName", "intro", "createdAt", "updatedAt")
SELECT pa."id" || '-zone-1', pa."id", '1', '', '預設小區（由系統自動建立）', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "pastoral_areas" pa
WHERE NOT EXISTS (
  SELECT 1 FROM "pastoral_zones" z WHERE z."pastoralAreaId" = pa."id"
);

UPDATE "small_groups" g
SET "zoneId" = z."id"
FROM "pastoral_zones" z
WHERE g."pastoralAreaId" = z."pastoralAreaId"
  AND g."zoneId" IS NULL
  AND z."code" = '1';

-- Fallback: any leftover groups without zone (should be rare)
UPDATE "small_groups" g
SET "zoneId" = (
  SELECT z."id" FROM "pastoral_zones" z
  WHERE z."pastoralAreaId" = g."pastoralAreaId"
  ORDER BY z."createdAt" ASC
  LIMIT 1
)
WHERE g."zoneId" IS NULL;

-- Require zoneId
ALTER TABLE "small_groups" ALTER COLUMN "zoneId" SET NOT NULL;

ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "pastoral_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "small_groups_zoneId_idx" ON "small_groups"("zoneId");
