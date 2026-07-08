-- #150: legal representative ID parity for company joint obligors and avals
-- (Tenant already has the column). Additive nullable — safe on live data.
ALTER TABLE "JointObligor" ADD COLUMN "legalRepId" TEXT;
ALTER TABLE "Aval" ADD COLUMN "legalRepId" TEXT;
