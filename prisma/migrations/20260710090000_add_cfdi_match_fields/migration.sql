-- Ownership match snapshot for the partner search portal (#225).
-- What we sent to micfdi as match_fields — the values a client types at
-- facturacion.hestiaplp.com.mx to find + stamp their record. Snapshotted so a
-- later edit of the policy's contractStartDate can't desync support debugging.
ALTER TABLE "CfdiRecord" ADD COLUMN "matchPolicyNumber" TEXT;
ALTER TABLE "CfdiRecord" ADD COLUMN "matchContractStart" TEXT;
