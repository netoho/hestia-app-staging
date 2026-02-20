-- AlterTable: Remove paymentStatus column from Policy
ALTER TABLE "Policy" DROP COLUMN IF EXISTS "paymentStatus";
