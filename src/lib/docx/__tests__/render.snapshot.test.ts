import { describe, it, expect } from 'bun:test';
import { extractDocumentXml } from './support/extractDocumentXml';
import { ALL_FIXTURES } from './support/fixtures';

/**
 * Snapshot the prettified `word/document.xml` that the cover-page renderer produces
 * for each fixture. Changes in layout (row order, column widths, cell borders,
 * label text, spacing) surface as diffs inside the snapshot file; regenerate with
 *
 *   bun test --update-snapshots src/lib/docx/__tests__/render.snapshot.test.ts
 *
 * Inspect the rendered .docx for a real policy via:
 *   bun run cover:fixture <policyId>
 */
describe('cover page word/document.xml', () => {
  for (const [name, input] of Object.entries(ALL_FIXTURES)) {
    it(`matches the expected document.xml for fixture: ${name}`, async () => {
      const xml = await extractDocumentXml(input);
      expect(xml).toMatchSnapshot();
    });
  }
});
