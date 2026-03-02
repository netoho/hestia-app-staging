/**
 * Orchestrator: fetches policy data, transforms it, and renders the .docx cover page.
 */

import { getPolicyForPDF } from '@/lib/services/policyService';
import { transformPolicyForPDF } from '@/lib/pdf/policyDataTransformer';
import { buildCoverPageData } from './coverPageTransformer';
import { renderCoverPageDocx } from './coverPageDocxTemplate';

export async function generateCoverPageDocx(policyId: string): Promise<Buffer> {
  const policy = await getPolicyForPDF(policyId);
  if (!policy) throw new Error(`Policy not found: ${policyId}`);

  const pdfData = transformPolicyForPDF(policy);
  const coverData = buildCoverPageData(pdfData);

  return renderCoverPageDocx(coverData);
}

export function getCoverPageFilename(policyNumber: string): string {
  return `caratula_${policyNumber}.docx`;
}
