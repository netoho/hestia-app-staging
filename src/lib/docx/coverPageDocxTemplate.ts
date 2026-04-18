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
  HeightRule,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import type { CoverPageData, CoverActorData, CoverGuarantorProperty } from './types';
import { yyyymmdd } from './dateToSpanishLong';
import { BLANK, NA, BOUNDARY_DIRECTIONS } from './coverPageDefaults';

// ─── Styling constants ──────────────────────────────────────────────
const FONT = 'Arial';
// All text 9pt (half-points = 18) per spec — titles stand out via bold + centering, not size
const SZ = 18;
const SZ_TITLE = 18;
const SZ_SUBTITLE = 18;
const SZ_SMALL = 18;

const LABEL_BG = 'D6E4F0'; // light blue

// Row height — minimum 0.81 cm = 459 twips (1 cm ≈ 567 twips)
const ROW_HEIGHT_MIN = 459;
// Cell margins — top/bottom 0, left/right 0.19 cm = 108 twips
const CELL_MARGINS = { top: 0, bottom: 0, left: 108, right: 108 };

const THIN = { style: BorderStyle.SINGLE as const, size: 1, color: '000000' };
const NO_B = { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' };

// Outer table (vlabel | inner) — border rectangle with one vertical divider between vlabel and inner.
// insideHorizontal is THIN so multi-row outer tables (company section) have row separators;
// single-row outer tables (individual / simple sections) are unaffected.
const OUTER_BORDERS = {
  top: THIN, bottom: THIN, left: THIN, right: THIN,
  insideVertical: THIN,
  insideHorizontal: THIN,
};

// Inner table — grid lines only (no outer rectangle; the outer table provides that)
const INNER_BORDERS = {
  top: NO_B, bottom: NO_B, left: NO_B, right: NO_B,
  insideHorizontal: THIN, insideVertical: THIN,
};

// Outer widths
const W_VL = 5;   // vlabel column (% of page)
const W_INNER = 95;

// Actor inner grid (% of inner table): L + V + L + V = 100
const A_L = 16;
const A_V = 34;

// Guarantor-property inner grid: 12 equal cols of (100/12)% — every row expresses itself in columnSpans that sum to 12
const GP_COL = 100 / 12;

// Simple inner grid (label + value): 25% + 75% = 100
const S_L = 25;
const S_V = 75;

// ─── Text / paragraph helpers ───────────────────────────────────────
function txt(value: string, bold = false, size = SZ): TextRun {
  return new TextRun({ text: value, font: FONT, size, bold });
}

function para(
  value: string,
  bold = false,
  size = SZ,
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType],
): Paragraph {
  return new Paragraph({
    children: [txt(value, bold, size)],
    alignment,
    spacing: { before: 20, after: 20 },
  });
}

/** Empty spacing paragraph used between consecutive tables. */
function gap(after = 120): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: FONT, size: SZ_SMALL })],
    spacing: { before: 0, after },
  });
}

// ─── Cell factories ─────────────────────────────────────────────────
function vlabelCell(label: string): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [txt(label, true, SZ)],
      alignment: AlignmentType.CENTER,
    })],
    textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
    shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: W_VL, type: WidthType.PERCENTAGE },
    margins: CELL_MARGINS,
  });
}

function lblCell(label: string, width: number, columnSpan?: number): TableCell {
  return new TableCell({
    children: [para(label, false)], // non-bold label text per spec
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: LABEL_BG, type: ShadingType.CLEAR }, // blue background
    margins: CELL_MARGINS,
    ...(columnSpan && columnSpan > 1 ? { columnSpan } : {}),
  });
}

function valCell(
  value: string,
  width: number,
  columnSpan?: number,
  opts?: { center?: boolean },
): TableCell {
  return new TableCell({
    children: [para(value, true, SZ, opts?.center ? AlignmentType.CENTER : undefined)], // bold value
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGINS,
    ...(columnSpan && columnSpan > 1 ? { columnSpan } : {}),
  });
}

// ─── Section wrapper: nested tables (outer vlabel | inner content) ──
function sectionTable(vlabel: string, innerRows: TableRow[]): Table {
  const inner = new Table({
    rows: innerRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: INNER_BORDERS,
    layout: TableLayoutType.FIXED,
  });

  // Inherit borders from the outer Table (top/bottom/left/right + insideVertical) so the
  // outer rectangle + vlabel divider render; inner Table provides the grid lines.
  const innerCell = new TableCell({
    children: [inner],
    width: { size: W_INNER, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  return new Table({
    rows: [new TableRow({
      children: [vlabelCell(vlabel), innerCell],
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: OUTER_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

/**
 * Company actor section — one outer table with 3 rows:
 *   row 1: vlabel (topLabel) | inner table of topRows (company info + constitution)
 *   row 2: full-width transition cell (bridgeLabel, blue bg, bold, centered)
 *   row 3: vlabel (bottomLabel) | inner table of bottomRows (rep info + power of attorney)
 * Used for both company landlords and company tenants.
 */
function companySectionTable(
  topLabel: string,
  topRows: TableRow[],
  bridgeLabel: string,
  bottomLabel: string,
  bottomRows: TableRow[],
): Table {
  const topInner = new Table({
    rows: topRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: INNER_BORDERS,
    layout: TableLayoutType.FIXED,
  });
  const bottomInner = new Table({
    rows: bottomRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: INNER_BORDERS,
    layout: TableLayoutType.FIXED,
  });

  const topRow = new TableRow({
    children: [
      vlabelCell(topLabel),
      new TableCell({
        children: [topInner],
        width: { size: W_INNER, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      }),
    ],
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
    children: [
      vlabelCell(bottomLabel),
      new TableCell({
        children: [bottomInner],
        width: { size: W_INNER, type: WidthType.PERCENTAGE },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      }),
    ],
  });

  return new Table({
    rows: [topRow, bridgeRow, bottomRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: OUTER_BORDERS,
    layout: TableLayoutType.FIXED,
  });
}

// ─── Row builders (actor 4-col grid) ────────────────────────────────
function aRow2(l1: string, v1: string, l2: string, v2: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [lblCell(l1, A_L), valCell(v1, A_V), lblCell(l2, A_L), valCell(v2, A_V)],
  });
}

function aRow1(label: string, value: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [lblCell(label, A_L), valCell(value, A_V + A_L + A_V, 3)],
  });
}

function aRowSubHeader(text: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [new TableCell({
      children: [para(text, true, SZ, AlignmentType.CENTER)],
      columnSpan: 4,
      width: { size: 100, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
      margins: CELL_MARGINS,
    })],
  });
}

// ─── Row builders (guarantor property 12-col grid) ──────────────────
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
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [
      lblCell('Tipo de Uso:', GP_COL * 3, 3),
      lblCell('Habitacional.', GP_COL * 2, 2),
      valCell(hab ? 'X' : NA, GP_COL, 1, { center: true }),
      lblCell('Comercial.', GP_COL * 2, 2),
      valCell(com ? 'X' : NA, GP_COL, 1, { center: true }),
      lblCell('Industrial.', GP_COL * 2, 2),
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

// ─── Row builders (simple 2-col grid) ───────────────────────────────
function sRow(label: string, value: string): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children: [lblCell(label, S_L), valCell(value, S_V)],
  });
}

// ─── Actor tables ───────────────────────────────────────────────────
function individualActorRows(a: CoverActorData): TableRow[] {
  return [
    aRow2('Nombre:', a.name, 'Nacionalidad:', a.nationality),
    aRow1('Domicilio:', a.address),
    aRow2('Identificación:', a.identificationType, 'Número:', a.identificationNumber),
    aRow2('RFC:', a.rfc, 'CURP:', a.curp),
    aRow2('Correo electrónico:', a.email, 'Teléfono:', a.phone),
  ];
}

function companyActorRows(a: CoverActorData): TableRow[] {
  return [
    aRow2('Denominación:', a.name, 'Nacionalidad:', a.nationality),
    aRow1('Domicilio:', a.address),
    aRow1('RFC:', a.rfc),
    aRowSubHeader('Datos de Constitución de la Persona Moral.'),
    aRow2('Escritura:', a.constitutionDeed, 'Fecha:', a.constitutionDate),
    aRow2('Notario:', a.constitutionNotary, 'Notaría:', a.constitutionNotaryNumber),
    aRow1('Registro Público:', a.registryCity),
    aRow2('Folio Registro Público:', a.registryFolio, 'Fecha Inscripción:', a.registryDate),
  ];
}

function legalRepRows(a: CoverActorData): TableRow[] {
  return [
    aRow2('Nombre:', a.legalRepName, 'Cargo:', a.legalRepPosition),
    aRow2('Identificación:', a.legalRepIdentificationType, 'Número:', a.legalRepIdentificationNumber),
    aRow2('Domicilio:', a.legalRepAddress, 'Teléfono:', a.legalRepPhone),
    aRow2('RFC:', a.legalRepRfc, 'CURP:', a.legalRepCurp),
    aRow2('Correo Electrónico Laboral:', a.legalRepWorkEmail, 'Correo Electrónico Personal:', a.legalRepEmail),
    aRowSubHeader('Datos de la escritura de poderes'),
    aRow2('Escritura:', a.powerDeed, 'Fecha:', a.powerDate),
    aRow2('Notario:', a.powerNotary, 'Notaría:', a.powerNotaryNumber),
  ];
}

function actorTable(actor: CoverActorData): Table {
  if (actor.isCompany) {
    return companySectionTable(
      actor.label,
      companyActorRows(actor),
      'Representante Legal.',
      'Representante Legal.',
      legalRepRows(actor),
    );
  }
  return sectionTable(actor.label, individualActorRows(actor));
}

// ─── Guarantor property table ───────────────────────────────────────
function guarantorPropertyTable(prop: CoverGuarantorProperty): Table {
  const rows: TableRow[] = [
    gpRow2('Escritura Número:', prop.deedNumber, 'Fecha de otorgamiento:', prop.deedDate),
    gpRow3('Notaría No:', prop.notaryNumber, 'Ciudad:', prop.city, 'Notario:', prop.notaryName),
    gpRow2('Folio del Registro Público de la Propiedad:', prop.registryFolio, 'Fecha de inscripción:', prop.registryDate),
    gpRow1('Inscrita en el Registro Público de:', prop.registryCity),
    gpTipoUsoRow(prop.useHabitacional, prop.useComercial, prop.useIndustrial),
    gpRow1('Dirección:', prop.address),
    gpRow2('Superficie de Terreno:', prop.landArea, 'Superficie de Construcción:', prop.constructionArea),
  ];

  // Always render the four cardinal boundaries — matches sample contract convention.
  BOUNDARY_DIRECTIONS.forEach((dir, i) => {
    const match = prop.boundaries.find(b => b.direction.toLowerCase() === dir.toLowerCase());
    rows.push(gpBoundaryRow(
      i === 0 ? 'Linderos y Colindancias:' : '',
      `Al ${dir}:`,
      match?.value ?? BLANK,
    ));
  });

  return sectionTable('Inmueble del Obligado Solidario y Fiador.', rows);
}

// ─── Inmueble (property) table ──────────────────────────────────────
function inmuebleTable(data: CoverPageData): Table {
  const ct = data.contractTerms;
  return sectionTable('Inmueble.', [
    sRow('Ubicación:', ct.propertyAddress),
    sRow('Cajón(es) de estacionamiento:', ct.parkingSpaces),
    sRow('Uso:', ct.propertyUse),
  ]);
}

// ─── Condiciones del arrendamiento table ────────────────────────────
function condicionesTable(data: CoverPageData): Table {
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

// ─── Método de pago table ───────────────────────────────────────────
function metodoPagoTable(data: CoverPageData): Table {
  const description = data.contractTerms.paymentMethodDescription;
  const lines = description.split('\n');
  const paragraphs = lines.map((line, i) =>
    new Paragraph({
      children: [txt(line, i === 0, SZ)], // first line bold
      spacing: { before: 20, after: 20 },
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

// ─── Main renderer ──────────────────────────────────────────────────
export async function renderCoverPageDocx(data: CoverPageData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Titles
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

  // Actor tables with gaps between sections
  const allActors = [
    ...data.landlords,
    ...data.tenants,
    ...data.jointObligors,
    ...data.avals,
  ];
  for (const actor of allActors) {
    children.push(actorTable(actor));
    children.push(gap());
  }

  // Guarantor properties
  for (const prop of data.guarantorProperties) {
    children.push(guarantorPropertyTable(prop));
    children.push(gap());
  }

  // Condiciones del Arrendamiento heading
  children.push(new Paragraph({
    children: [txt('Condiciones del Arrendamiento.', true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 160 },
  }));
  children.push(inmuebleTable(data));
  children.push(gap());
  children.push(condicionesTable(data));
  children.push(gap());
  children.push(metodoPagoTable(data));

  // Header: "<policyNumber> - <YYYYMMDD>" matching real samples
  const headerDate = yyyymmdd(data.contractStartDateRaw);
  const headerText = headerDate ? `${data.policyNumber} - ${headerDate}` : data.policyNumber;
  const header = new Header({
    children: [new Paragraph({
      children: [txt(headerText, false, SZ_SMALL)],
      alignment: AlignmentType.RIGHT,
    })],
  });

  // Footer: "Página X de Y"
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
          margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 },
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
