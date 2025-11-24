-- This is an empty migration.

  -- Add new enum type
  CREATE TYPE "JointObligorType" AS ENUM ('INDIVIDUAL', 'COMPANY');

  -- Add new column to JointObligor table
  ALTER TABLE "JointObligor"
  ADD COLUMN "jointObligorType" "JointObligorType" NOT NULL DEFAULT 'INDIVIDUAL';

  -- Migrate existing data based on isCompany
  UPDATE "JointObligor"
  SET "jointObligorType" = CASE
    WHEN "isCompany" = true THEN 'COMPANY'::"JointObligorType"
    ELSE 'INDIVIDUAL'::"JointObligorType"
  END;

  -- Drop old isCompany column (optional, after verification)
  ALTER TABLE "JointObligor"
  DROP COLUMN "isCompany";
