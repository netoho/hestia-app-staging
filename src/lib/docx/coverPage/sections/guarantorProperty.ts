/**
 * Guarantor property section — "Inmueble del Obligado Solidario y Fiador." block.
 *
 * Renders as a 12-column grid so a mix of 2-, 3-, 6- and 7-cell rows align across:
 *   - 2-cell rows (escritura + fecha)           → 2 + 4 + 2 + 4
 *   - 3-cell rows (notaría + ciudad + notario)  → 2 + 2 + 2 + 2 + 2 + 2
 *   - single-label rows                         → 2 + 10
 *   - tipo de uso row (3 boolean pairs)         → 3 + 2 + 1 + 2 + 1 + 2 + 1
 *   - boundary rows (siempre cuatro cardinales) → 3 + 2 + 7
 */

import { TableRow, Table, HeightRule } from 'docx';
import type { CoverGuarantorProperty } from '../../types';
import { BLANK, NA, BOUNDARY_DIRECTIONS } from '../../coverPageDefaults';
import { t } from '@/lib/i18n';
import { GP_COL, ROW_HEIGHT_MIN } from '../styles';
import { lblCell, valCell } from '../cells';
import { sectionTable } from '../sectionTable';

function gpRow2(l1: string, v1: string, l2: string, v2: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [
      lblCell(l1, GP_COL * 2, 2),
      valCell(v1, GP_COL * 4, 4),
      lblCell(l2, GP_COL * 2, 2),
      valCell(v2, GP_COL * 4, 4),
    ],
  });
}

function gpRow3(l1: string, v1: string, l2: string, v2: string, l3: string, v3: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [
      lblCell(l1, GP_COL * 2, 2),
      valCell(v1, GP_COL * 2, 2),
      lblCell(l2, GP_COL * 2, 2),
      valCell(v2, GP_COL * 2, 2),
      lblCell(l3, GP_COL * 2, 2),
      valCell(v3, GP_COL * 2, 2),
    ],
  });
}

function gpRow1(label: string, value: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [lblCell(label, GP_COL * 2, 2), valCell(value, GP_COL * 10, 10)],
  });
}

function gpTipoUsoRow(hab: boolean, com: boolean, ind: boolean): TableRow {
  const cp = t.pages.documents.coverPage.guarantorProperty;
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [
      lblCell(cp.usage, GP_COL * 3, 3),
      lblCell(cp.residential, GP_COL * 2, 2),
      valCell(hab ? 'X' : NA, GP_COL, 1, { center: true }),
      lblCell(cp.commercial, GP_COL * 2, 2),
      valCell(com ? 'X' : NA, GP_COL, 1, { center: true }),
      lblCell(cp.industrial, GP_COL * 2, 2),
      valCell(ind ? 'X' : NA, GP_COL, 1, { center: true }),
    ],
  });
}

function gpBoundaryRow(label: string, direction: string, description: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [
      lblCell(label, GP_COL * 3, 3),
      lblCell(direction, GP_COL * 2, 2),
      valCell(description, GP_COL * 7, 7),
    ],
  });
}

export function guarantorPropertyTable(prop: CoverGuarantorProperty): Table {
  const cp = t.pages.documents.coverPage;
  const gp = cp.guarantorProperty;

  const rows: TableRow[] = [
    gpRow2(gp.deedNumber, prop.deedNumber, gp.deedDate, prop.deedDate),
    gpRow3(gp.notaryNumber, prop.notaryNumber, gp.city, prop.city, gp.notary, prop.notaryName),
    gpRow2(gp.registryFolio, prop.registryFolio, gp.registryDate, prop.registryDate),
    gpRow1(gp.registry, prop.registryCity),
    gpTipoUsoRow(prop.useHabitacional, prop.useComercial, prop.useIndustrial),
    gpRow1(gp.address, prop.address),
    gpRow2(gp.landArea, prop.landArea, gp.constructionArea, prop.constructionArea),
  ];

  // Always render the four cardinal boundaries — matches sample contract convention.
  BOUNDARY_DIRECTIONS.forEach((dir, i) => {
    const match = prop.boundaries.find(b => b.direction.toLowerCase() === dir.toLowerCase());
    rows.push(gpBoundaryRow(
      i === 0 ? gp.boundaries : '',
      cp.boundaryLabels[dir],
      match?.value ?? BLANK,
    ));
  });

  return sectionTable(gp.sectionLabel, rows);
}
