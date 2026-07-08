-- #212 (CFDI T1): per-payment CFDI e-invoice record (micfdi integration).
-- No fiscal identity stored here — the receptor self-attests at the micfdi portal.

-- CreateTable
CREATE TABLE "CfdiRecord" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "micfdiRecordId" TEXT,
    "portalUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "paymentForm" TEXT NOT NULL,
    "description" TEXT,
    "folio" TEXT,
    "uuid" TEXT,
    "subtotal" DOUBLE PRECISION,
    "iva" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "stampedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfdiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CfdiRecord_paymentId_key" ON "CfdiRecord"("paymentId");

-- CreateIndex
CREATE INDEX "CfdiRecord_status_idx" ON "CfdiRecord"("status");

-- AddForeignKey
ALTER TABLE "CfdiRecord" ADD CONSTRAINT "CfdiRecord_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
