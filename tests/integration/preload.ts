/**
 * Bun preload for integration tests.
 *
 * Loaded via: `bun test --preload ./tests/integration/preload.ts ...`
 *
 * Responsibilities:
 *   1. Hard-assert DATABASE_URL ends in `_test` — refuse to run otherwise.
 *   2. Stub external-service modules (stripe, nodemailer, S3 presigner, google maps,
 *      emailService, notificationService) with no-op implementations. Per-test
 *      argument assertions still work via `spyOn`.
 *   3. beforeEach: truncate + reseed the test DB.
 *   4. afterAll: disconnect prisma.
 */

import { mock, beforeEach, afterAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// 1. Safety: never run integration tests against a non-test database.
//
// `.env.test.local` commonly points at the dev DB (documented footgun — see
// docs/TESTING.md). Instead of forcing a manual stash dance, fall back to
// `.env.test`'s DATABASE_URL when it is a proper *_test URL; refuse only when
// no safe URL exists.
// ---------------------------------------------------------------------------
function readEnvTestDatabaseUrl(): string | undefined {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.test'), 'utf8');
    const line = raw.split('\n').find((l) => l.trim().startsWith('DATABASE_URL='));
    if (!line) return undefined;
    let value = line.trim().slice('DATABASE_URL='.length).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  } catch {
    return undefined;
  }
}

let dbUrl = process.env.DATABASE_URL ?? '';
if (!dbUrl.endsWith('_test')) {
  const fallback = readEnvTestDatabaseUrl();
  if (fallback?.endsWith('_test')) {
    console.warn(
      `[preload] DATABASE_URL is not a *_test database (got: ${dbUrl || '<unset>'}) — falling back to .env.test's DATABASE_URL`,
    );
    process.env.DATABASE_URL = fallback;
    dbUrl = fallback;
  } else {
    throw new Error(
      `[preload] Refusing to run integration tests: DATABASE_URL must end in "_test" (got: ${dbUrl || '<unset>'})`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. External-service mocks (hoisted before any test imports source modules).
// ---------------------------------------------------------------------------

// `server-only` throws at import time when Next's webpack hasn't replaced it.
// Stub it so server-side modules can be imported in the test runtime.
mock.module('server-only', () => ({}));

// --- Next.js request scope (for REST route handler tests) -----------------
// `next/headers` and `next-auth/next` need a request scope to work in
// production. We expose a global `__testHeaders` and `__testSession` that
// REST tests can set per-call (see tests/integration/restHelpers.ts).
const globalAny = globalThis as unknown as {
  __testHeaders?: Record<string, string>;
  __testSession?: { user: { id: string; email: string; name: string; role: string } } | null;
};
globalAny.__testHeaders = globalAny.__testHeaders ?? {};
globalAny.__testSession = globalAny.__testSession ?? null;

mock.module('next/headers', () => ({
  headers: async () => new Headers(globalAny.__testHeaders ?? {}),
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    has: () => false,
  }),
}));

mock.module('next-auth/next', () => ({
  getServerSession: async () => globalAny.__testSession,
  default: () => ({}),
}));

mock.module('next-auth', () => ({
  default: () => ({}),
  getServerSession: async () => globalAny.__testSession,
}));

// --- Reminder services (cron endpoints) -----------------------------------
// Reminder services are NOT mocked. Cron tests run them against the real
// (per-test reset+seeded) DB so the test verifies the service actually finds
// the policies it should. The email sends inside each service are mocked at
// the emailService boundary above, so no real outbound traffic.

// --- DOCX and PDF generation (REST policy routes) -------------------------
mock.module('@/lib/docx', () => ({
  generateCoverPageDocx: mock(async () => Buffer.from('fake-docx-buffer')),
  getCoverPageFilename: mock((policyNumber: string) => `cover-${policyNumber}.docx`),
}));
mock.module('@/lib/pdf', () => ({
  generatePolicyPDF: mock(async () => Buffer.from('fake-pdf-buffer')),
  getPolicyPDFFilename: mock((policyNumber: string) => `policy-${policyNumber}.pdf`),
}));

// --- Stripe SDK ------------------------------------------------------------
// Constructed via `new Stripe(secret)` in paymentService and webhook route.
// Each method returns a canned object that satisfies the consumer's reads.
class FakeStripe {
  checkout = {
    sessions: {
      create: mock(async () => ({
        id: 'cs_test_fake',
        url: 'https://stripe.test/cs_test_fake',
        payment_intent: 'pi_test_fake',
      })),
      retrieve: mock(async () => ({
        id: 'cs_test_fake',
        payment_status: 'paid',
        payment_intent: 'pi_test_fake',
      })),
      expire: mock(async () => ({ id: 'cs_test_fake', status: 'expired' })),
    },
  };
  webhooks = {
    constructEvent: mock((body: string | Buffer) =>
      typeof body === 'string' ? JSON.parse(body) : JSON.parse(body.toString('utf8')),
    ),
  };
  paymentIntents = {
    create: mock(async (params: { amount?: number; metadata?: Record<string, string> }) => ({
      id: 'pi_test_fake',
      status: 'requires_action',
      amount: params?.amount ?? 0,
      next_action: {
        display_bank_transfer_instructions: {
          financial_addresses: [
            {
              spei: {
                clabe: '646180111811111111',
                bank_name: 'Citibanamex',
              },
            },
          ],
          reference: 'REF-TEST-12345',
          hosted_instructions_url: 'https://stripe.test/spei/instructions',
        },
      },
      metadata: params?.metadata ?? {},
    })),
    retrieve: mock(async () => ({
      id: 'pi_test_fake',
      status: 'succeeded',
      latest_charge: {
        id: 'ch_test_fake',
        receipt_url: 'https://stripe.test/receipts/ch_test_fake',
      },
    })),
  };
  customers = {
    create: mock(async (params: { email?: string; name?: string }) => ({
      id: 'cus_test_fake',
      email: params?.email,
      name: params?.name,
    })),
  };
  refunds = {
    create: mock(async () => ({ id: 're_test_fake', status: 'succeeded' })),
  };
}
mock.module('stripe', () => ({ default: FakeStripe }));

// --- Nodemailer ------------------------------------------------------------
mock.module('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mock(async () => ({ accepted: ['test@hestia.com'], messageId: 'test-message-id' })),
      verify: mock(async () => true),
    }),
  },
  createTransport: () => ({
    sendMail: mock(async () => ({ accepted: ['test@hestia.com'], messageId: 'test-message-id' })),
    verify: mock(async () => true),
  }),
}));

// --- AWS S3 presigner ------------------------------------------------------
mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mock(async () => 'https://test-bucket.s3.amazonaws.com/test-key?X-Amz-Signature=fake'),
}));

// --- Document service (S3 boundary) -----------------------------------------
// Wraps S3 presigning + key generation; receipts and actor documents flow
// through it. Mock at the boundary so tests don't depend on AWS at all.
// Methods used by the document.* router happy paths (`getById`, `getByActor`,
// `generateUploadUrl`, `confirmUpload`, `deleteDocument`) defer to the real
// per-test Postgres so factory-seeded rows are visible end-to-end.
mock.module('@/lib/services/documentService', () => {
  // Lazy require so the singleton is initialized after env preload finishes.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: prismaSingleton } = require('@/lib/prisma');
  return ({
  documentService: {
    generateReceiptS3Key: mock(
      (policyNumber: string, tenantId: string, year: number, month: number, type: string, fileName: string) =>
        `receipts/${policyNumber}/${tenantId}/${year}-${String(month).padStart(2, '0')}-${type}-${fileName}`,
    ),
    generateActorDocumentS3Key: mock(
      (policyNumber: string, actorType: string, actorId: string, category: string, fileName: string) =>
        `actor-docs/${policyNumber}/${actorType}/${actorId}/${category}-${fileName}`,
    ),
    getUploadUrl: mock(async (s3Key: string) => `https://test-bucket.s3.amazonaws.com/${s3Key}?upload=fake`),
    getDownloadUrl: mock(async (s3Key: string) => `https://test-bucket.s3.amazonaws.com/${s3Key}?download=fake`),
    getViewUrl: mock(async (s3Key: string) => `https://test-bucket.s3.amazonaws.com/${s3Key}?view=fake`),
    getPublicUrl: mock((s3Key: string) => `https://test-bucket.s3.amazonaws.com/${s3Key}`),
    fileExists: mock(async () => true),
    deleteFile: mock(async () => true),
    getFileMetadata: mock(async () => ({ ContentLength: 1024, ContentType: 'application/pdf' })),
    uploadActorDocument: mock(async () => ({ id: 'doc_test_fake' })),
    uploadPolicyDocument: mock(async () => ({ id: 'doc_test_fake' })),
    validatePolicyDocuments: mock(async () => ({ valid: true, missing: [] })),
    getStorageProvider: mock(() => 's3'),
    // Used by document.router for actor-document flow.
    // Smart mocks: query real prisma so factory-created rows are returned.
    getById: mock(async (documentId: string) =>
      prismaSingleton.actorDocument.findUnique({ where: { id: documentId } }),
    ),
    getByActor: mock(async (actorId: string, actorType: string) => {
      const actorField = actorType === 'jointObligor' ? 'jointObligorId' : `${actorType}Id`;
      return prismaSingleton.actorDocument.findMany({
        where: { [actorField]: actorId, uploadStatus: 'COMPLETE' },
        orderBy: { createdAt: 'desc' },
      });
    }),
    generateUploadUrl: mock(async (input: {
      policyNumber: string;
      policyId: string;
      actorType: string;
      actorId: string;
      category: string;
      documentType: string;
      fileName: string;
      contentType: string;
      fileSize: number;
      uploadedBy?: string;
    }) => {
      const actorField = input.actorType === 'jointObligor' ? 'jointObligorId' : `${input.actorType}Id`;
      const s3Key = `actor-docs/${input.policyNumber}/${input.actorType}/${input.actorId}/${input.category}-${input.fileName}`;
      const document = await prismaSingleton.actorDocument.create({
        data: {
          category: input.category,
          documentType: input.documentType,
          fileName: input.fileName,
          originalName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.contentType,
          s3Key,
          s3Bucket: 'test-bucket',
          s3Region: 'us-east-1',
          [actorField]: input.actorId,
          uploadStatus: 'PENDING',
          uploadedBy: input.uploadedBy ?? 'self',
        },
      });
      return {
        uploadUrl: `https://test-bucket.s3.amazonaws.com/${s3Key}?upload=fake`,
        documentId: document.id,
        s3Key,
        expiresIn: 60,
      };
    }),
    confirmUpload: mock(async (documentId: string) => {
      const updated = await prismaSingleton.actorDocument.update({
        where: { id: documentId },
        data: { uploadStatus: 'COMPLETE', uploadedAt: new Date() },
      });
      return {
        success: true,
        document: {
          id: updated.id,
          fileName: updated.fileName,
          category: updated.category,
          documentType: updated.documentType,
          fileSize: updated.fileSize,
          uploadedAt: updated.uploadedAt ?? new Date(),
        },
      };
    }),
    deleteDocument: mock(async (documentId: string) => {
      await prismaSingleton.actorDocument.delete({ where: { id: documentId } }).catch(() => null);
      return true;
    }),
    // Used by investigation.router. Mirrors the actor-document smart pattern.
    generateInvestigationUploadUrl: mock(async (input: {
      investigationId: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    }) => {
      const s3Key = `investigations/test/${input.investigationId}/${input.fileName}`;
      const document = await prismaSingleton.actorInvestigationDocument.create({
        data: {
          investigationId: input.investigationId,
          fileName: input.fileName,
          originalName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.contentType,
          s3Key,
          s3Bucket: 'test-bucket',
          uploadStatus: 'PENDING',
        },
      });
      return {
        uploadUrl: `https://test-bucket.s3.amazonaws.com/${s3Key}?upload=fake`,
        documentId: document.id,
        s3Key,
        expiresIn: 60,
      };
    }),
    getInvestigationDocument: mock(async (documentId: string) =>
      prismaSingleton.actorInvestigationDocument.findUnique({ where: { id: documentId } }),
    ),
    deleteInvestigationDocument: mock(async (documentId: string) => {
      await prismaSingleton.actorInvestigationDocument
        .delete({ where: { id: documentId } })
        .catch(() => null);
      return true;
    }),
  },
  // Standalone exports used by user.router and onboard.router for avatar uploads.
  uploadActorDocument: mock(async () => ({ id: 'doc_test_fake' })),
  uploadPolicyDocument: mock(async () => ({ id: 'doc_test_fake' })),
  getDocumentUrl: mock(async () => 'https://test-bucket.s3.amazonaws.com/fake?view=fake'),
  getDocumentDownloadUrl: mock(async () => 'https://test-bucket.s3.amazonaws.com/fake?download=fake'),
  deleteDocument: mock(async () => true),
  verifyDocument: mock(async () => true),
  getDocumentMetadata: mock(async () => ({ ContentLength: 1024 })),
  getSignedDownloadUrl: mock(async () => 'https://test-bucket.s3.amazonaws.com/fake?download=fake'),
  validatePolicyDocuments: mock(async () => ({ valid: true, missing: [] })),
  getPublicDownloadUrl: mock(() => 'https://test-bucket.s3.amazonaws.com/fake'),
  getCurrentStorageProvider: mock(() => 's3'),
  });
});

// --- Google Maps service (HTTP calls go to Google in real impl) -----------
mock.module('@/lib/services/googleMapsService', () => ({
  googleMapsService: {
    searchPlaces: mock(async () => [
      { placeId: 'place-fake', description: 'Test address', mainText: 'Test', secondaryText: 'address', types: [] },
    ]),
    getPlaceDetails: mock(async () => ({
      placeId: 'place-fake',
      formattedAddress: 'Test address, Mexico',
      latitude: 19.4326,
      longitude: -99.1332,
      addressComponents: {},
    })),
    parseGooglePlaceToAddress: mock(async () => ({
      street: 'Test Street',
      exteriorNumber: '1',
      neighborhood: 'Test',
      postalCode: '00000',
      municipality: 'Test',
      city: 'Test',
      state: 'Test',
      country: 'México',
      placeId: 'place-fake',
      formattedAddress: 'Test address, Mexico',
    })),
  },
}));

// --- Email service (boundary-level mock — every send is a no-op true) ----
// Bun resolves named imports statically: every function consumed in source
// must be explicitly listed here.
const noopEmail = () => mock(async () => true);
mock.module('@/lib/services/emailService', () => ({
  sendPolicySubmissionConfirmation: noopEmail(),
  sendActorInvitation: noopEmail(),
  sendJoinUsNotification: noopEmail(),
  sendActorRejectionEmail: noopEmail(),
  sendUserInvitation: noopEmail(),
  sendPolicyStatusUpdate: noopEmail(),
  sendActorIncompleteReminder: noopEmail(),
  sendPolicyCreatorSummary: noopEmail(),
  sendPasswordResetEmail: noopEmail(),
  sendPaymentCompletedEmail: noopEmail(),
  sendPaymentLinkEmail: noopEmail(),
  sendAllPaymentsCompletedEmail: noopEmail(),
  sendPolicyCancellationEmail: noopEmail(),
  sendSimpleNotificationEmail: noopEmail(),
  sendInvestigationSubmittedEmail: noopEmail(),
  sendInvestigationApprovalRequestEmail: noopEmail(),
  sendInvestigationResultEmail: noopEmail(),
  sendReceiptReminder: noopEmail(),
  sendReceiptMagicLink: noopEmail(),
  sendPolicyExpirationReminder: noopEmail(),
  sendPolicyQuarterlyFollowup: noopEmail(),
  sendPasswordResetConfirmation: noopEmail(),
  sendTenantReplacementEmail: noopEmail(),
  sendPolicyPendingApprovalEmail: noopEmail(),
}));

// --- Notification service (boundary-level mock — every send is a no-op) ---
// sendIncompleteActorInfoNotification returns the actual invitations array in
// production. The empty array satisfies the .output() schema for
// policy.sendInvitations and reflects "no actors needed an invitation" — tests
// that care about the invitation list use spyOn to assert call arguments.
mock.module('@/lib/services/notificationService', () => ({
  sendIncompleteActorInfoNotification: mock(async () => []),
  sendTenantReplacementNotification: mock(async () => undefined),
  sendPolicyCancellationNotification: mock(async () => undefined),
  sendPolicyPendingApprovalNotification: mock(async () => undefined),
}));

// ---------------------------------------------------------------------------
// 3. Per-test DB lifecycle.
// ---------------------------------------------------------------------------
import { prisma, resetDatabase, seedTestData } from '../utils/database';
import { BaseService } from '@/lib/services/base/BaseService';

// Silence service-level logs during tests unless VERBOSE_TEST_LOGS is set.
// Service errors are part of the contract under test (NOT_FOUND, expired
// tokens, validation failures) — logging them as console.error pollutes test
// output even when the test EXPECTS the throw. Production code is untouched.
if (!process.env.VERBOSE_TEST_LOGS) {
  (BaseService.prototype as unknown as { log: () => void }).log = () => {};
}

beforeEach(async () => {
  await resetDatabase();
  await seedTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});
