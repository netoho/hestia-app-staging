import { APP_ENV, E2E_DATABASE_URL } from './playwright.config';

/**
 * Runs once before the suite:
 * 1. Pins DATABASE_URL for the spec-side prisma client (tests/utils/database.ts
 *    guards against non-*_test URLs — hestia_e2e_test passes).
 * 2. Resets + seeds the e2e DB (admin user, packages, SystemConfig).
 *
 * DB/bucket provisioning (CREATE DATABASE + prisma db push + MinIO bucket) is
 * NOT done here — `bun run test:e2e` runs `pretest:e2e` (docker up + provision)
 * and CI has explicit steps. Keeping globalSetup fast and side-effect-obvious.
 */
export default async function globalSetup() {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  for (const [k, v] of Object.entries(APP_ENV)) {
    if (k !== 'NODE_ENV' && process.env[k] === undefined) process.env[k] = v;
  }

  const { prisma, resetDatabase, seedTestData } = await import('../utils/database');
  await resetDatabase();
  await seedTestData();
  await prisma.$disconnect();
  console.log('[e2e] database reset + seeded (admin@hestiaplp.com.mx / password123)');

  await ensureBucket();
}

/** Idempotently create the MinIO bucket the presigned-upload flow targets. */
async function ensureBucket(): Promise<void> {
  const { S3Client, CreateBucketCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: APP_ENV.AWS_S3_REGION,
    endpoint: APP_ENV.AWS_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: APP_ENV.AWS_ACCESS_KEY_ID,
      secretAccessKey: APP_ENV.AWS_SECRET_ACCESS_KEY,
    },
  });
  try {
    await client.send(new CreateBucketCommand({ Bucket: APP_ENV.AWS_S3_BUCKET }));
    console.log(`[e2e] created MinIO bucket ${APP_ENV.AWS_S3_BUCKET}`);
  } catch (err) {
    const name = (err as { name?: string }).name ?? '';
    if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') return;
    throw err;
  } finally {
    client.destroy();
  }
}
