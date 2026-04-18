/**
 * Outer-table wrappers that compose a rotated vlabel column with an inner content table.
 *
 * `sectionTable` is the simple form: one vlabel cell next to an inner table of rows.
 * `companySectionTable` stacks two inner tables separated by a full-width bridge cell —
 * used for company actors (constitution block + representative block divided by
 * "Representante Legal." heading row).
 */

import {
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  HeightRule,
  AlignmentType,
  ShadingType,
  TableLayoutType,
} from 'docx';
import {
  W_INNER,
  OUTER_BORDERS,
  INNER_BORDERS,
  ROW_HEIGHT_MIN,
  CELL_MARGINS,
  LABEL_BG,
  SZ,
} from './styles';
import { para } from './helpers';
import { vlabelCell } from './cells';

function buildInner(rows: TableRow[]): Table {
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: INNER_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

function innerCellOf(inner: Table): TableCell {
  return new TableCell({
    children: [inner],
    width: { size: W_INNER, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}

export function sectionTable(vlabel: string, innerRows: TableRow[]): Table {
  return new Table({
    rows: [new TableRow({
      children: [vlabelCell(vlabel), innerCellOf(buildInner(innerRows))],
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: OUTER_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

export function companySectionTable(
  topLabel: string,
  topRows: TableRow[],
  bridgeLabel: string,
  bottomLabel: string,
  bottomRows: TableRow[],
): Table {
  const topRow = new TableRow({
    children: [vlabelCell(topLabel), innerCellOf(buildInner(topRows))],
  });

  const bridgeRow = new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [new TableCell({
      children: [para(bridgeLabel, true, SZ, AlignmentType.CENTER)],
      columnSpan: 2,
      width: { size: 100, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
      margins: CELL_MARGINS,
    })],
  });

  const bottomRow = new TableRow({
    children: [vlabelCell(bottomLabel), innerCellOf(buildInner(bottomRows))],
  });

  return new Table({
    rows: [topRow, bridgeRow, bottomRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: OUTER_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}
