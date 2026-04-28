/**
 * Cell factories for the cover-page tables.
 * - `vlabelCell`: rotated vertical label shown on the left of every section.
 * - `lblCell`: label cell with blue background (non-bold text per spec).
 * - `valCell`: value cell with bold text; optional center alignment for X/N/A marks.
 */

import {
  TableCell,
  Paragraph,
  AlignmentType,
  WidthType,
  VerticalAlign,
  TextDirection,
  ShadingType,
} from 'docx';
import { CELL_MARGINS, LABEL_BG, SZ, W_VL } from './styles';
import { para, txt } from './helpers';

export function vlabelCell(label: string, opts?: { size?: number }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [txt(label, true, opts?.size ?? SZ)],
      alignment: AlignmentType.CENTER,
    })],
    textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: W_VL, type: WidthType.PERCENTAGE },
    margins: CELL_MARGINS,
  });
}

export function lblCell(label: string, width: number, columnSpan?: number): TableCell {
  return new TableCell({
    children: [para(label, false)],
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
    margins: CELL_MARGINS,
    ...(columnSpan && columnSpan > 1 ? { columnSpan } : {}),
  });
}

export function valCell(
  value: string,
  width: number,
  columnSpan?: number,
  opts?: { center?: boolean },
): TableCell {
  return new TableCell({
    children: [para(value, true, SZ, opts?.center ? AlignmentType.CENTER : undefined)],
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGINS,
    ...(columnSpan && columnSpan > 1 ? { columnSpan } : {}),
  });
}
