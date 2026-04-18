/**
 * Orchestrator: fetches policy data, transforms it, and renders the .docx cover page.
 */

import { getPolicyForCover } from '@/lib/services/policyService';
import { buildCoverPageData } from './coverPageTransformer';
import { renderCoverPageDocx } from './coverPage';

export async function generateCoverPageDocx(policyId: string): Promise<Buffer> {
  const policy = await getPolicyForCover(policyId);
  if (!policy) throw new Error(`Policy not found: ${policyId}`);

  const coverData = buildCoverPageData(policy);
  return renderCoverPageDocx(coverData);
}

export function getCoverPageFilename(policyNumber: string): string {
  return `caratula_${policyNumber}.docx`;
}
