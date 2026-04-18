/**
 * Contract-terms sections — simple 2-column (label | value) grid used by:
 *   - Inmueble           (property summary)
 *   - Condiciones del arrendamiento (rent, deposit, term, dates, maintenance)
 *   - Método de pago     (free-form paragraphs describing payment method)
 *
 * Inmueble and Condiciones are expressed as `SimpleRowSpec[]`; Método de pago
 * keeps its bespoke single-cell paragraph block because the content is a
 * free-form description, not a row list.
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
import { ROW_HEIGHT_MIN, CELL_MARGINS, SZ, SPACING } from '../styles';
import { txt } from '../helpers';
import { sectionTable } from '../sectionTable';
import { renderSimpleRow, type SimpleRowSpec } from '../rowSpec';

export function inmuebleRowSpecs(data: CoverPageData): SimpleRowSpec[] {
  const inm = t.pages.documents.coverPage.inmueble;
  const ct = data.contractTerms;
  return [
    { kind: 'simple.pair', label: inm.location, value: ct.propertyAddress },
    { kind: 'simple.pair', label: inm.parkingSpaces, value: ct.parkingSpaces },
    { kind: 'simple.pair', label: inm.usage, value: ct.propertyUse },
  ];
}

export function condicionesRowSpecs(data: CoverPageData): SimpleRowSpec[] {
  const co = t.pages.documents.coverPage.condiciones;
  const ct = data.contractTerms;
  return [
    { kind: 'simple.pair', label: co.rent, value: ct.rentDisplay },
    { kind: 'simple.pair', label: co.securityDeposit, value: ct.securityDeposit },
    { kind: 'simple.pair', label: co.term, value: ct.contractLength },
    { kind: 'simple.pair', label: co.startDate, value: ct.startDate },
    { kind: 'simple.pair', label: co.endDate, value: ct.endDate },
    { kind: 'simple.pair', label: co.deliveryDate, value: ct.deliveryDate },
    { kind: 'simple.pair', label: co.maintenance, value: ct.maintenanceFee },
  ];
}

export function inmuebleTable(data: CoverPageData): Table {
  const inm = t.pages.documents.coverPage.inmueble;
  return sectionTable(inm.sectionLabel, inmuebleRowSpecs(data).map(renderSimpleRow));
}

export function condicionesTable(data: CoverPageData): Table {
  const co = t.pages.documents.coverPage.condiciones;
  return sectionTable(co.sectionLabel, condicionesRowSpecs(data).map(renderSimpleRow));
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
