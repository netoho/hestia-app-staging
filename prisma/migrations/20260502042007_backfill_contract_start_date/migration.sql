-- This is an empty migration.


 UPDATE "Policy"
 SET "contractStartDate" = "activatedAt",
     "contractEndDate"   = "expiresAt"
 WHERE "contractStartDate" IS NULL
   AND "activatedAt" IS NOT NULL;

