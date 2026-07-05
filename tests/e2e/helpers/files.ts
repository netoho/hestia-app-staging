import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Minimal valid PDF for document uploads (real bytes → real presigned PUT to
 * MinIO → real confirmUpload; the C1 "prod 500 on every upload" regression
 * class is exactly this path).
 */
const MINIMAL_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
190
%%EOF
`;

let dir: string | null = null;

/** Returns a path to a small valid PDF named for the category (fresh per run). */
export function samplePdf(name: string): string {
  if (!dir) dir = mkdtempSync(join(tmpdir(), 'hestia-e2e-'));
  const path = join(dir, `${name}.pdf`);
  writeFileSync(path, MINIMAL_PDF);
  return path;
}
