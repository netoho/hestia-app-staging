-- Full-fidelity archive snapshots on the actor History tables (#159).
-- Additive + nullable: safe to run on live data, no backfill needed
-- (pre-existing rows keep snapshot = NULL; only archives created after
-- deploy carry the full snapshot).

ALTER TABLE "TenantHistory" ADD COLUMN "snapshot" JSONB;
ALTER TABLE "JointObligorHistory" ADD COLUMN "snapshot" JSONB;
ALTER TABLE "AvalHistory" ADD COLUMN "snapshot" JSONB;
