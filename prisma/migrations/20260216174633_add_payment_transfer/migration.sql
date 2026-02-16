-- CreateTable
CREATE TABLE "PaymentTransfer" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cumulativeAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "stripeEventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransfer_stripeEventId_key" ON "PaymentTransfer"("stripeEventId");

-- CreateIndex
CREATE INDEX "PaymentTransfer_paymentId_idx" ON "PaymentTransfer"("paymentId");

-- AddForeignKey
ALTER TABLE "PaymentTransfer" ADD CONSTRAINT "PaymentTransfer_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
