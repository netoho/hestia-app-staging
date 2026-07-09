-- Add SAT c_FormaPago code for manual-payment CFDI issuance (#213).
-- Nullable: Stripe payments derive the forma from the payment method; only
-- manually-recorded payments carry an admin-picked code here.
ALTER TABLE "Payment" ADD COLUMN "satFormaPago" TEXT;
