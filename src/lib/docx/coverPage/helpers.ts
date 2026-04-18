/**
 * Text and paragraph primitives used by every cover-page section.
 */

import { Paragraph, TextRun, AlignmentType } from 'docx';
import { FONT, SZ, SZ_SMALL, SPACING } from './styles';

export function txt(value: string, bold = false, size = SZ): TextRun {
  return new TextRun({ text: value, font: FONT, size, bold });
}

export function para(
  value: string,
  bold = false,
  size = SZ,
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType],
): Paragraph {
  return new Paragraph({
    children: [txt(value, bold, size)],
    alignment,
    spacing: { before: SPACING.paraBeforeAfter, after: SPACING.paraBeforeAfter },
  });
}

/** Empty spacing paragraph used between consecutive tables. */
export function gap(after = SPACING.gapAfter): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: FONT, size: SZ_SMALL })],
    spacing: { before: 0, after },
  });
}
