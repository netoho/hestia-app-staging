-- Create sequence for atomic internalId allocation
CREATE SEQUENCE IF NOT EXISTS user_internal_id_seq;

-- Pre-seed sequence to current max so the next nextval() returns max+1
SELECT setval('user_internal_id_seq', COALESCE((SELECT MAX("internalId") FROM "User"), 0));

-- Make Postgres assign internalId atomically on insert when omitted
ALTER TABLE "User" ALTER COLUMN "internalId" SET DEFAULT nextval('user_internal_id_seq');

-- Tie sequence lifetime to the column
ALTER SEQUENCE user_internal_id_seq OWNED BY "User"."internalId";
