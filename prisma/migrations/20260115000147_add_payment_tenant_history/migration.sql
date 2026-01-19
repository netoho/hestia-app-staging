-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paidByTenantName" TEXT,
ADD COLUMN     "stripeReceiptUrl" TEXT;
