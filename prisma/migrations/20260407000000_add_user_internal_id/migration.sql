-- AlterTable
ALTER TABLE "User" ADD COLUMN "internalId" INTEGER;

-- Backfill existing users with consecutive IDs ordered by creation date
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn FROM "User"
)
UPDATE "User" SET "internalId" = ranked.rn FROM ranked WHERE "User".id = ranked.id;

-- CreateIndex
CREATE UNIQUE INDEX "User_internalId_key" ON "User"("internalId");
