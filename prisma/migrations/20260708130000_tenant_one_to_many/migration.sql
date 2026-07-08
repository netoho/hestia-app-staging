-- #169 S5b: a policy has 1..N tenants; drop the 1:1 unique, keep the FK.
-- The FK "Tenant_policyId_fkey" (ON DELETE CASCADE) is unchanged.
DROP INDEX "Tenant_policyId_key";

CREATE INDEX "Tenant_policyId_idx" ON "Tenant"("policyId");
