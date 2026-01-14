import { renderToBuffer } from '@react-pdf/renderer';
import { PolicyDocument } from '@/templates/pdf/policy';
import { getPolicyForPDF } from '@/lib/services/policyService';
import { transformPolicyForPDF } from './policyDataTransformer';

/**
 * Generate PDF buffer for a policy
 */
export async function generatePolicyPDF(policyId: string): Promise<Buffer> {
  // Fetch complete policy data
  const policy = await getPolicyForPDF(policyId);

  if (!policy) {
    throw new Error(`Policy not found: ${policyId}`);
  }

  // Transform data for PDF
  const pdfData = transformPolicyForPDF(policy);

  // Render PDF to buffer
  const pdfBuffer = await renderToBuffer(
    <PolicyDocument data={pdfData} />
  );

  return Buffer.from(pdfBuffer);
}

/**
 * Get filename for policy PDF
 */
export function getPolicyPDFFilename(policyNumber: string): string {
  const sanitized = policyNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  const date = new Date().toISOString().split('T')[0];
  return `poliza_${sanitized}_${date}.pdf`;
}
