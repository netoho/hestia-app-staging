-- Align User.internalId sequence with Prisma's @default(autoincrement()) convention.
-- Idempotent across three states:
--   (a) "User_internalId_seq" already exists  → noop
--   (b) legacy "user_internal_id_seq" exists  → rename (preserves counter; default ref auto-updates by OID)
--   (c) neither exists                        → create + seed + wire default
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'User_internalId_seq') THEN
    NULL;
  ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_internal_id_seq') THEN
    EXECUTE 'ALTER SEQUENCE user_internal_id_seq RENAME TO "User_internalId_seq"';
  ELSE
    EXECUTE 'CREATE SEQUENCE "User_internalId_seq"';
    PERFORM setval(
      '"User_internalId_seq"',
      COALESCE((SELECT MAX("internalId") FROM "User"), 1),
      (SELECT COUNT(*) > 0 FROM "User")
    );
    EXECUTE 'ALTER TABLE "User" ALTER COLUMN "internalId" SET DEFAULT nextval(''"User_internalId_seq"'')';
  END IF;
END $$;

ALTER TABLE "User" ALTER COLUMN "internalId" SET NOT NULL;
ALTER SEQUENCE "User_internalId_seq" OWNED BY "User"."internalId";
