-- AlterTable: add renewedToId self-relation to Policy for renewal tracking
ALTER TABLE "Policy" ADD COLUMN "renewedToId" TEXT;

-- Enforce one-to-one: each old Policy can renew to at most one new Policy,
-- and each new Policy can be renewed from at most one old Policy.
CREATE UNIQUE INDEX "Policy_renewedToId_key" ON "Policy"("renewedToId");

-- AddForeignKey
ALTER TABLE "Policy"
  ADD CONSTRAINT "Policy_renewedToId_fkey"
  FOREIGN KEY ("renewedToId") REFERENCES "Policy"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
