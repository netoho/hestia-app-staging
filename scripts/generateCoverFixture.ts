#!/usr/bin/env bun
/**
 * Generate a reviewable cover-page fixture from a real policy.
 *
 * Usage:
 *   bun run cover:fixture <policyId> [outDir=dev/fixtures/cover-samples]
 *
 * Writes two files, both named `<policyNumber>-<first-8-chars-of-id>`:
 *   - <slug>.docx        — rendered .docx for manual visual inspection
 *   - <slug>.input.json  — the CoverPageData actually fed to the renderer,
 *                          so the fixture can be replayed later
 *
 * The snapshot tests under `src/lib/docx/__tests__/` guard the renderer against
 * structural drift; this script is for humans reviewing pixel-level output and
 * for seeding example fixtures on a new environment.
 */

import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import prisma from '@/lib/prisma';
import { getPolicyForPDF } from '@/lib/services/policyService';
import { transformPolicyForPDF } from '@/lib/pdf/policyDataTransformer';
import { buildCoverPageData, renderCoverPageDocx } from '@/lib/docx';

async function main() {
  const [policyId, outDirArg] = process.argv.slice(2);
  if (!policyId) {
    console.error('Usage: bun run cover:fixture <policyId> [outDir=dev/fixtures/cover-samples]');
    process.exit(1);
  }

  const outDir = outDirArg ?? 'dev/fixtures/cover-samples';
  await mkdir(outDir, { recursive: true });

  const policy = await getPolicyForPDF(policyId);
  if (!policy) {
    console.error(`Policy not found: ${policyId}`);
    process.exit(1);
  }

  const pdfData = transformPolicyForPDF(policy);
  const input = buildCoverPageData(pdfData, {
    activatedAt: policy.activatedAt,
    expiresAt: policy.expiresAt,
    propertyDeliveryDate: policy.propertyDetails?.propertyDeliveryDate ?? null,
  });

  const docx = await renderCoverPageDocx(input);

  const slug = `${policy.policyNumber}-${policyId.slice(0, 8)}`;
  const docxPath = path.join(outDir, `${slug}.docx`);
  const inputPath = path.join(outDir, `${slug}.input.json`);

  await writeFile(docxPath, docx);
  await writeFile(inputPath, JSON.stringify(input, null, 2));

  console.log(`✓ Wrote ${docxPath}`);
  console.log(`✓ Wrote ${inputPath}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
