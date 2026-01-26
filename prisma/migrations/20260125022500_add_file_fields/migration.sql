/*
  Warnings:

  - You are about to drop the column `stripeReceiptUrl` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ActorDocument" ADD COLUMN     "uploadStatus" TEXT NOT NULL DEFAULT 'complete',
ADD COLUMN     "uploadedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "stripeReceiptUrl";
