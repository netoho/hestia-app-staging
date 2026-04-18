/**
 * Contract-terms sections — simple 2-column (label | value) grid used by:
 *   - Inmueble           (property summary)
 *   - Condiciones del arrendamiento (rent, deposit, term, dates, maintenance)
 *   - Método de pago     (free-form paragraphs describing payment method)
 */

import {
  TableRow,
  TableCell,
  Table,
  Paragraph,
  WidthType,
  VerticalAlign,
  HeightRule,
} from 'docx';
import type { CoverPageData } from '../../types';
import { t } from '@/lib/i18n';
import { S_L, S_V, ROW_HEIGHT_MIN, CELL_MARGINS, SZ, SPACING } from '../styles';
import { txt } from '../helpers';
import { lblCell, valCell } from '../cells';
import { sectionTable } from '../sectionTable';

function sRow(label: string, value: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [lblCell(label, S_L), valCell(value, S_V)],
  });
}

export function inmuebleTable(data: CoverPageData): Table {
  const inm = t.pages.documents.coverPage.inmueble;
  const ct = data.contractTerms;
  return sectionTable(inm.sectionLabel, [
    sRow(inm.location, ct.propertyAddress),
    sRow(inm.parkingSpaces, ct.parkingSpaces),
    sRow(inm.usage, ct.propertyUse),
  ]);
}

export function condicionesTable(data: CoverPageData): Table {
  const co = t.pages.documents.coverPage.condiciones;
  const ct = data.contractTerms;
  return sectionTable(co.sectionLabel, [
    sRow(co.rent, ct.rentDisplay),
    sRow(co.securityDeposit, ct.securityDeposit),
    sRow(co.term, ct.contractLength),
    sRow(co.startDate, ct.startDate),
    sRow(co.endDate, ct.endDate),
    sRow(co.deliveryDate, ct.deliveryDate),
    sRow(co.maintenance, ct.maintenanceFee),
  ]);
}

export function metodoPagoTable(data: CoverPageData): Table {
  const mp = t.pages.documents.coverPage.metodoPago;
  const description = data.contractTerms.paymentMethodDescription;
  const lines = description.split('\n');
  const paragraphs = lines.map((line, i) =>
    new Paragraph({
      children: [txt(line, i === 0, SZ)], // first line bold
      spacing: { before: SPACING.paraBeforeAfter, after: SPACING.paraBeforeAfter },
    }),
  );

  const contentCell = new TableCell({
    children: paragraphs,
    width: { size: 100, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGINS,
  });

  return sectionTable(mp.sectionLabel, [new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [contentCell],
  })]);
}
