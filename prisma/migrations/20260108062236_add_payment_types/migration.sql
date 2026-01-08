-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_VERIFICATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentType" ADD VALUE 'TENANT_PORTION';
ALTER TYPE "PaymentType" ADD VALUE 'LANDLORD_PORTION';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "checkoutUrl" TEXT,
ADD COLUMN     "checkoutUrlExpiry" TIMESTAMP(3),
ADD COLUMN     "receiptFileName" TEXT,
ADD COLUMN     "receiptS3Key" TEXT,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");
