/**
 * Render the contract cover page as a .docx Document using the `docx` package.
 */

import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  Packer,
  HeadingLevel,
  TableLayoutType,
} from 'docx';
import type { CoverPageData, CoverActorData, CoverGuarantorProperty } from './types';

// ─── Styling constants ──────────────────────────────────────────────
const FONT = 'Arial';
const FONT_SIZE = 22; // half-points → 11pt
const FONT_SIZE_TITLE = 28; // 14pt
const FONT_SIZE_SUBTITLE = 24; // 12pt

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const TABLE_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
  insideHorizontal: THIN_BORDER,
  insideVertical: THIN_BORDER,
};

// ─── Helpers ────────────────────────────────────────────────────────
function text(value: string, bold = false, size = FONT_SIZE): TextRun {
  return new TextRun({ text: value, font: FONT, size, bold });
}

function labelCell(label: string, rowSpan?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [text(label, true)], spacing: { before: 40, after: 40 } })],
    width: { size: 30, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    ...(rowSpan && rowSpan > 1 ? { rowSpan } : {}),
  });
}

function valueCell(value: string, colSpan?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [text(value)], spacing: { before: 40, after: 40 } })],
    width: { size: 70, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    ...(colSpan && colSpan > 1 ? { columnSpan: colSpan } : {}),
  });
}

function headerCell(value: string, colSpan?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [text(value, true, FONT_SIZE_SUBTITLE)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
    })],
    ...(colSpan && colSpan > 1 ? { columnSpan: colSpan } : {}),
    verticalAlign: VerticalAlign.CENTER,
  });
}

function row(label: string, value: string): TableRow {
  return new TableRow({ children: [labelCell(label), valueCell(value)] });
}

function sectionTitle(title: string): Paragraph {
  return new Paragraph({
    children: [text(title, true, FONT_SIZE_SUBTITLE)],
    spacing: { before: 300, after: 100 },
  });
}

function emptyParagraph(): Paragraph {
  return new Paragraph({ children: [], spacing: { before: 100 } });
}

// ─── Actor table ────────────────────────────────────────────────────
function actorTable(actor: CoverActorData): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [headerCell(actor.label, 2)] }),
  ];

  if (actor.isCompany) {
    rows.push(row('Denominación:', actor.name));
    rows.push(row('Escritura Constitutiva:', actor.companyConstitution));
    rows.push(row('Notario:', actor.notary));
    rows.push(row('Registro Público:', actor.publicRegistry));
    rows.push(row('Representante Legal:', actor.legalRepName));
    rows.push(row('Identificación Rep.:', actor.legalRepId));
  } else {
    rows.push(row('Nombre:', actor.name));
  }

  rows.push(row('Nacionalidad:', actor.nationality));
  rows.push(row('Domicilio:', actor.address));
  rows.push(row('Identificación:', actor.identificationType));
  rows.push(row('No. Identificación:', actor.identificationNumber));
  rows.push(row('RFC:', actor.rfc));
  rows.push(row('CURP:', actor.curp));
  rows.push(row('Email:', actor.email));
  rows.push(row('Teléfono:', actor.phone));

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Guarantor property table ───────────────────────────────────────
function guarantorPropertyTable(prop: CoverGuarantorProperty, index: number): Table {
  const label = `INMUEBLE DEL OBLIGADO${index > 0 ? ` ${index + 1}` : ''}`;
  return new Table({
    rows: [
      new TableRow({ children: [headerCell(label, 2)] }),
      row('Escritura:', prop.deedNumber),
      row('Notario:', prop.notary),
      row('Registro Público:', prop.publicRegistry),
      row('Uso:', prop.useType),
      row('Dirección:', prop.address),
      row('Superficie Terreno:', prop.landArea),
      row('Superficie Construcción:', prop.constructionArea),
      row('Linderos/Colindancias:', prop.boundaries),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Contract terms table ───────────────────────────────────────────
function contractTermsTable(data: CoverPageData): Table {
  const ct = data.contractTerms;
  const rows: TableRow[] = [
    new TableRow({ children: [headerCell('CONDICIONES DEL ARRENDAMIENTO', 2)] }),
    row('Inmueble:', ct.propertyAddress),
    row('Cajones de estacionamiento:', ct.parkingSpaces),
    row('Uso:', ct.propertyUse),
    row('Renta Mensual:', ct.rentFormatted),
    row('Renta en Letra:', ct.rentInWords),
    row('Depósito en Garantía:', ct.securityDeposit),
    row('Plazo:', ct.contractLength),
    row('Fecha de Inicio:', ct.startDate),
    row('Fecha de Término:', ct.endDate),
    row('Fecha de Entrega:', ct.deliveryDate),
    row('Mantenimiento:', ct.maintenanceFee),
    row('Método de Pago:', ct.paymentMethod),
  ];

  // Bank details if payment method involves transfer
  if (ct.bankName && ct.bankName !== '________________') {
    rows.push(row('Banco:', ct.bankName));
    rows.push(row('Titular de Cuenta:', ct.accountHolder));
    rows.push(row('No. de Cuenta:', ct.accountNumber));
    rows.push(row('CLABE:', ct.clabe));
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Signature block ────────────────────────────────────────────────
function signatureBlock(parties: CoverPageData['signatureParties']): Table {
  // Split into pairs for two-column layout
  const rows: TableRow[] = [];

  for (let i = 0; i < parties.length; i += 2) {
    const left = parties[i];
    const right = parties[i + 1];

    // Spacing row
    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [emptyParagraph(), emptyParagraph(), emptyParagraph()],
          borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        }),
        new TableCell({
          children: [emptyParagraph()],
          borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        }),
      ],
    }));

    // Signature line row
    const noBorders = {
      top: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
    };

    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [text('_______________________________')],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [text(left.name, true)],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [text(left.label)],
              alignment: AlignmentType.CENTER,
            }),
          ],
          borders: noBorders,
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        right
          ? new TableCell({
              children: [
                new Paragraph({
                  children: [text('_______________________________')],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [text(right.name, true)],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [text(right.label)],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              borders: noBorders,
              width: { size: 50, type: WidthType.PERCENTAGE },
            })
          : new TableCell({
              children: [emptyParagraph()],
              borders: noBorders,
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
      ],
    }));
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    layout: TableLayoutType.FIXED,
  });
}

// ─── Main renderer ──────────────────────────────────────────────────
export async function renderCoverPageDocx(data: CoverPageData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    children: [text('CONTRATO DE ARRENDAMIENTO.', true, FONT_SIZE_TITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  children.push(new Paragraph({
    children: [text('CARÁTULA.', true, FONT_SIZE_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Section: PARTES
  children.push(sectionTitle('I. PARTES'));

  // Landlords
  for (const landlord of data.landlords) {
    children.push(emptyParagraph());
    children.push(actorTable(landlord));
  }

  // Tenants
  for (const tenant of data.tenants) {
    children.push(emptyParagraph());
    children.push(actorTable(tenant));
  }

  // Joint Obligors
  for (const jo of data.jointObligors) {
    children.push(emptyParagraph());
    children.push(actorTable(jo));
  }

  // Avals
  for (const aval of data.avals) {
    children.push(emptyParagraph());
    children.push(actorTable(aval));
  }

  // Guarantor properties
  if (data.guarantorProperties.length > 0) {
    for (let i = 0; i < data.guarantorProperties.length; i++) {
      children.push(emptyParagraph());
      children.push(guarantorPropertyTable(data.guarantorProperties[i], i));
    }
  }

  // Section: CONTRACT TERMS
  children.push(emptyParagraph());
  children.push(sectionTitle('II. CONDICIONES DEL ARRENDAMIENTO'));
  children.push(emptyParagraph());
  children.push(contractTermsTable(data));

  // Section: SIGNATURES
  children.push(emptyParagraph());
  children.push(sectionTitle('FIRMAS'));
  children.push(emptyParagraph());
  children.push(signatureBlock(data.signatureParties));

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch = 1440 twips
        },
      },
      children,
    }],
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
        },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
