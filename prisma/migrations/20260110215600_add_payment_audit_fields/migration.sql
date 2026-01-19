-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "paymentStatus" "PaymentStatus";
