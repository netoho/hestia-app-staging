/**
 * Pack a cover-page Document and return the prettified `word/document.xml` string.
 *
 * The `docx` library scaffolds an OOXML file structure with a dozen of XML parts
 * (content-types, relationships, styles, fontTable, numbering, ...), but the thing
 * we actually author is the document body. Extracting just `word/document.xml`
 * from the zip keeps our snapshot focused on what our template produces.
 */

import { Packer, PrettifyType } from 'docx';
import JSZip from 'jszip';
import type { CoverPageData } from '../../types';
import { buildCoverPageDocument } from '../../coverPage';

export async function extractDocumentXml(data: CoverPageData): Promise<string> {
  const doc = buildCoverPageDocument(data);
  const buffer = await Packer.toBuffer(doc, PrettifyType.WITH_2_BLANKS);
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('word/document.xml missing from generated cover page');
  return entry.async('string');
}
