-- CreateEnum
CREATE TYPE "PolicyCancellationReason" AS ENUM ('CLIENT_REQUEST', 'NON_PAYMENT', 'FRAUD', 'DOCUMENTATION_ISSUES', 'LANDLORD_REQUEST', 'TENANT_REQUEST', 'OTHER');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "cancellationComment" TEXT,
ADD COLUMN     "cancellationReason" "PolicyCancellationReason",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
