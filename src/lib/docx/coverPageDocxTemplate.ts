/**
 * Render the contract cover page as a .docx Document using the `docx` package.
 * Matches the formatting of sample contracts in documents/contracts/screenshots/.
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
  TableLayoutType,
  TextDirection,
  ShadingType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import type { CoverPageData, CoverActorData, CoverGuarantorProperty } from './types';

// ─── Styling constants ──────────────────────────────────────────────
const FONT = 'Arial';
const SZ = 20; // half-points → 10pt
const SZ_TITLE = 26; // 13pt
const SZ_SUBTITLE = 22; // 11pt
const SZ_SMALL = 18; // 9pt

const LABEL_BG = 'D6E4F0'; // Light blue
const BLANK = '';

const THIN = { style: BorderStyle.SINGLE as const, size: 1, color: '000000' };
const BORDERS = {
  top: THIN, bottom: THIN, left: THIN, right: THIN,
  insideHorizontal: THIN, insideVertical: THIN,
};
const NO_BORDER = { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// Column widths for 5-column layout (vertical-label | label | value | label | value)
const COL_VLABEL = 5;   // %
const COL_LABEL = 14;   // %
const COL_VALUE = 31;   // %
// Total: 5 + 14 + 31 + 14 + 31 = 95... let's adjust
// 5 + 15 + 30 + 15 + 35 = 100
const W_VL = 5;
const W_L1 = 15;
const W_V1 = 30;
const W_L2 = 15;
const W_V2 = 35;

// ─── Helpers ────────────────────────────────────────────────────────
function txt(value: string, bold = false, size = SZ): TextRun {
  return new TextRun({ text: value, font: FONT, size, bold });
}

function para(value: string, bold = false, size = SZ, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]): Paragraph {
  return new Paragraph({
    children: [txt(value, bold, size)],
    alignment,
    spacing: { before: 20, after: 20 },
  });
}

/** Vertical label cell — rotated text, light blue background, spans N rows */
function vlabelCell(label: string, rowSpan: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [txt(label, true, SZ)],
      alignment: AlignmentType.CENTER,
    })],
    textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
    shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: W_VL, type: WidthType.PERCENTAGE },
    rowSpan,
  });
}

/** Bold label cell */
function lbl(label: string, width = W_L1): TableCell {
  return new TableCell({
    children: [para(label, true)],
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
  });
}

/** Value cell */
function val(value: string, width = W_V1, colSpan?: number): TableCell {
  return new TableCell({
    children: [para(value)],
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    ...(colSpan && colSpan > 1 ? { columnSpan: colSpan } : {}),
  });
}

/** Full-width value cell spanning label+value+label+value (4 cols) */
function fullVal(value: string): TableCell {
  return new TableCell({
    children: [para(value)],
    width: { size: W_L1 + W_V1 + W_L2 + W_V2, type: WidthType.PERCENTAGE },
    columnSpan: 4,
    verticalAlign: VerticalAlign.CENTER,
  });
}

/** Section sub-header row spanning all 5 cols */
function subHeaderRow5(text: string): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        children: [para(text, true, SZ)],
        columnSpan: 5,
        verticalAlign: VerticalAlign.CENTER,
      }),
    ],
  });
}

/** Standard 2-field row: | label1 | value1 | label2 | value2 | */
function row2(l1: string, v1: string, l2: string, v2: string): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [lbl(l1), val(v1), lbl(l2, W_L2), val(v2, W_V2)],
  });
}

/** Single wide-field row: | label | value (spanning 3 cols) | */
function row1(label: string, value: string): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [lbl(label), val(value, W_V1 + W_L2 + W_V2, 3)],
  });
}

// ─── Actor table (individual) ───────────────────────────────────────
function individualActorRows(a: CoverActorData): TableRow[] {
  return [
    row2('Nombre:', a.name, 'Nacionalidad:', a.nationality),
    row1('Domicilio:', a.address),
    row2('Identificación:', a.identificationType, 'Número:', a.identificationNumber),
    row2('RFC:', a.rfc, 'CURP', a.curp),
    row2('Correo electrónico:', a.email, 'Teléfono:', a.phone),
  ];
}

// ─── Actor table (company) ──────────────────────────────────────────
function companyActorRows(a: CoverActorData): TableRow[] {
  return [
    row2('Denominación:', a.name, 'Nacionalidad:', a.nationality),
    row1('Domicilio:', a.address),
    row1('RFC:', a.rfc),
  ];
}

function companyConstitutionRows(a: CoverActorData): TableRow[] {
  return [
    subHeaderRow5('Datos de Constitución de la Persona Moral.'),
    row2('Escritura:', a.constitutionDeed, 'Fecha:', a.constitutionDate),
    row2('Notario:', a.constitutionNotary, 'Notaría:', a.constitutionNotaryNumber),
    row1('Registro Público:', a.registryCity),
    row2('Folio Registro Público:', a.registryFolio, 'Fecha Inscripción:', a.registryDate),
  ];
}

function legalRepRows(a: CoverActorData): TableRow[] {
  return [
    row2('Nombre:', a.legalRepName, 'Cargo:', a.legalRepPosition),
    row2('Identificación:', a.legalRepIdentificationType, 'Número:', a.legalRepIdentificationNumber),
    row1('Domicilio:', a.legalRepAddress),
    row2('Teléfono:', a.legalRepPhone, '', ''),
    row2('RFC:', a.legalRepRfc, 'CURP:', a.legalRepCurp),
    row2('Correo Electrónico Laboral:', a.legalRepWorkEmail, 'Correo Electrónico Personal:', a.legalRepEmail),
    // Power of attorney
    subHeaderRow5('Datos de la escritura de poderes'),
    row2('Escritura:', a.powerDeed, 'Fecha:', a.powerDate),
    row2('Notario:', a.powerNotary, 'Notaría:', a.powerNotaryNumber),
  ];
}

/** Build a complete actor section as a single table with vertical label */
function actorTable(actor: CoverActorData): Table {
  let dataRows: TableRow[];

  if (actor.isCompany) {
    // Company: main info + constitution + legal rep (legal rep gets its own vertical label)
    const mainRows = companyActorRows(actor);
    const constRows = companyConstitutionRows(actor);
    dataRows = [...mainRows, ...constRows];
  } else {
    dataRows = individualActorRows(actor);
  }

  const rowCount = dataRows.length;

  // First row gets the vertical label cell
  const rows: TableRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const existingCells = dataRows[i].options?.children || [];
    if (i === 0) {
      rows.push(new TableRow({
        cantSplit: true,
        children: [vlabelCell(actor.label, rowCount), ...existingCells],
      }));
    } else {
      rows.push(new TableRow({
        cantSplit: true,
        children: existingCells,
      }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

/** Legal rep section as separate table with its own vertical label */
function legalRepTable(actor: CoverActorData): Table {
  const dataRows = legalRepRows(actor);
  const rowCount = dataRows.length;

  const rows: TableRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const existingCells = dataRows[i].options?.children || [];
    if (i === 0) {
      rows.push(new TableRow({
        cantSplit: true,
        children: [vlabelCell('Representante Legal.', rowCount), ...existingCells],
      }));
    } else {
      rows.push(new TableRow({
        cantSplit: true,
        children: existingCells,
      }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Guarantor property table ───────────────────────────────────────
function guarantorPropertyTable(prop: CoverGuarantorProperty): Table {
  const dataRows: TableRow[] = [
    row2('Escritura Número:', prop.deedNumber, 'Fecha de otorgamiento:', prop.deedDate),
    row2('Notaría No:', prop.notaryNumber, 'Ciudad:', prop.city),
    row2('', '', 'Notario:', prop.notaryName),
    row2('Folio del Registro Público de la Propiedad:', prop.registryFolio, 'Fecha de inscripción:', prop.registryDate),
    row1('Inscrita en el Registro Público de:', prop.registryCity),
    row2('Tipo de Uso:', prop.useType, '', ''),
    row1('Dirección:', prop.address),
    row2('Superficie de Terreno:', prop.landArea, 'Superficie de Construcción:', prop.constructionArea),
  ];

  // Boundary rows
  if (prop.boundaries.length > 0) {
    // First boundary gets the "Linderos y Colindancias" label
    for (let i = 0; i < prop.boundaries.length; i++) {
      const b = prop.boundaries[i];
      if (i === 0) {
        dataRows.push(row2('Linderos y Colindancias', '', b.direction + ':', b.value));
      } else {
        dataRows.push(row2('', '', b.direction + ':', b.value));
      }
    }
  } else {
    dataRows.push(row1('Linderos y Colindancias:', BLANK));
  }

  const rowCount = dataRows.length;
  const rows: TableRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const existingCells = dataRows[i].options?.children || [];
    if (i === 0) {
      rows.push(new TableRow({
        cantSplit: true,
        children: [vlabelCell('Inmueble del Obligado Solidario y Fiador.', rowCount), ...existingCells],
      }));
    } else {
      rows.push(new TableRow({
        cantSplit: true,
        children: existingCells,
      }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Condiciones: Inmueble table ────────────────────────────────────
function inmuebleTable(data: CoverPageData): Table {
  const ct = data.contractTerms;
  const dataRows: TableRow[] = [
    row1('Ubicación:', ct.propertyAddress),
    row1('Cajón(es) de estacionamiento:', ct.parkingSpaces),
    row1('Uso:', ct.propertyUse),
  ];

  const rowCount = dataRows.length;
  const rows: TableRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const existingCells = dataRows[i].options?.children || [];
    if (i === 0) {
      rows.push(new TableRow({
        cantSplit: true,
        children: [vlabelCell('Inmueble.', rowCount), ...existingCells],
      }));
    } else {
      rows.push(new TableRow({
        cantSplit: true,
        children: existingCells,
      }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Condiciones: terms table ───────────────────────────────────────
function condicionesTable(data: CoverPageData): Table {
  const ct = data.contractTerms;
  const dataRows: TableRow[] = [
    row1('Monto de Renta:', ct.rentDisplay),
    row1('Depósito en Garantía:', ct.securityDeposit),
    row1('Plazo:', ct.contractLength),
    row1('Fecha de Inicio:', ct.startDate),
    row1('Fecha de Término:', ct.endDate),
    row1('Fecha de Entrega Posesión:', ct.deliveryDate),
    row1('Monto Mantenimiento:', ct.maintenanceFee),
  ];

  const rowCount = dataRows.length;
  const rows: TableRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const existingCells = dataRows[i].options?.children || [];
    if (i === 0) {
      rows.push(new TableRow({
        cantSplit: true,
        children: [vlabelCell('Condiciones del arrendamiento.', rowCount), ...existingCells],
      }));
    } else {
      rows.push(new TableRow({
        cantSplit: true,
        children: existingCells,
      }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Método de pago table ───────────────────────────────────────────
function metodoPagoTable(data: CoverPageData): Table {
  const description = data.contractTerms.paymentMethodDescription;
  // Split by newlines to handle multi-line payment descriptions
  const lines = description.split('\n');
  const paragraphs = lines.map((line, i) =>
    new Paragraph({
      children: [txt(line, i === 0, SZ)], // First line bold
      spacing: { before: 20, after: 20 },
    })
  );

  const dataCell = new TableCell({
    children: paragraphs,
    width: { size: 100 - W_VL, type: WidthType.PERCENTAGE },
    columnSpan: 4,
    verticalAlign: VerticalAlign.CENTER,
  });

  return new Table({
    rows: [
      new TableRow({
        cantSplit: true,
        children: [vlabelCell('Método de pago.', 1), dataCell],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Main renderer ──────────────────────────────────────────────────
export async function renderCoverPageDocx(data: CoverPageData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    children: [txt('CONTRATO DE ARRENDAMIENTO.', true, SZ_TITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [txt('CARÁTULA.', true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [txt('PARTES.', true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  }));

  // Actor tables
  const allActors = [
    ...data.landlords,
    ...data.tenants,
    ...data.jointObligors,
    ...data.avals,
  ];

  for (const actor of allActors) {
    children.push(actorTable(actor));
    if (actor.isCompany) {
      children.push(legalRepTable(actor));
    }
  }

  // Guarantor properties
  for (const prop of data.guarantorProperties) {
    children.push(guarantorPropertyTable(prop));
  }

  // Condiciones del Arrendamiento
  children.push(new Paragraph({
    children: [txt('Condiciones del Arrendamiento.', true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 160 },
  }));
  children.push(inmuebleTable(data));
  children.push(condicionesTable(data));

  // Método de pago
  children.push(metodoPagoTable(data));

  // Header: policy number right-aligned
  const header = new Header({
    children: [new Paragraph({
      children: [txt(data.policyNumber, false, SZ_SMALL)],
      alignment: AlignmentType.RIGHT,
    })],
  });

  // Footer: page numbers
  const footer = new Footer({
    children: [new Paragraph({
      children: [
        txt('Página ', false, SZ_SMALL),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ_SMALL }),
        txt(' de ', false, SZ_SMALL),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: SZ_SMALL }),
      ],
      alignment: AlignmentType.RIGHT,
    })],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 }, // 1in top/bottom, 0.75in sides
        },
      },
      headers: { default: header },
      footers: { default: footer },
      children,
    }],
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SZ },
        },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
