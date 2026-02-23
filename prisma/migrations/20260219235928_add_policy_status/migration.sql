-- AlterEnum: Replace APPROVED with ACTIVE + EXPIRED

-- 1. Create new enum
CREATE TYPE "PolicyStatus_new" AS ENUM ('COLLECTING_INFO', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- 2. Drop default, convert column to TEXT for data migration
ALTER TABLE "Policy" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Policy" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);

-- 3. Migrate APPROVED rows
UPDATE "Policy"
SET "status" = 'EXPIRED'
WHERE "status" = 'APPROVED'
  AND "activatedAt" IS NOT NULL
  AND "expiresAt" IS NOT NULL
  AND "expiresAt" < NOW();

UPDATE "Policy"
SET "status" = 'ACTIVE'
WHERE "status" = 'APPROVED'
  AND "activatedAt" IS NOT NULL;

UPDATE "Policy"
SET "status" = 'PENDING_APPROVAL'
WHERE "status" = 'APPROVED';

-- 4. Convert TEXT column to new enum, swap names, drop old
ALTER TABLE "Policy" ALTER COLUMN "status" TYPE "PolicyStatus_new" USING ("status"::"PolicyStatus_new");
ALTER TYPE "PolicyStatus" RENAME TO "PolicyStatus_old";
ALTER TYPE "PolicyStatus_new" RENAME TO "PolicyStatus";
DROP TYPE "PolicyStatus_old";

-- 5. Restore default
ALTER TABLE "Policy" ALTER COLUMN "status" SET DEFAULT 'COLLECTING_INFO';
