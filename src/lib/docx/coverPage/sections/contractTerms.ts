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
  const ct = data.contractTerms;
  return sectionTable('Inmueble.', [
    sRow('Ubicación:', ct.propertyAddress),
    sRow('Cajón(es) de estacionamiento:', ct.parkingSpaces),
    sRow('Uso:', ct.propertyUse),
  ]);
}

export function condicionesTable(data: CoverPageData): Table {
  const ct = data.contractTerms;
  return sectionTable('Condiciones del arrendamiento.', [
    sRow('Monto de Renta:', ct.rentDisplay),
    sRow('Depósito en Garantía:', ct.securityDeposit),
    sRow('Plazo:', ct.contractLength),
    sRow('Fecha de Inicio:', ct.startDate),
    sRow('Fecha de Término:', ct.endDate),
    sRow('Fecha de Entrega Posesión:', ct.deliveryDate),
    sRow('Monto Mantenimiento:', ct.maintenanceFee),
  ]);
}

export function metodoPagoTable(data: CoverPageData): Table {
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

  return sectionTable('Método de pago.', [new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [contentCell],
  })]);
}
