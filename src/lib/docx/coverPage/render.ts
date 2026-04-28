/**
 * Assemble the full cover-page Document from section tables and write it to a Buffer.
 */

import {
  Document,
  Paragraph,
  Table,
  TextRun,
  AlignmentType,
  Packer,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import type { CoverPageData } from '../types';
import { yyyymmdd } from '../dateToSpanishLong';
import { t } from '@/lib/i18n';
import {
  FONT,
  SZ,
  SZ_TITLE,
  SZ_SUBTITLE,
  SZ_SMALL,
  SPACING,
  PAGE_MARGINS,
} from './styles';
import { txt, gap, blankLine } from './helpers';
import { actorTable } from './sections/actor';
import { guarantorPropertyTable } from './sections/guarantorProperty';
import { inmuebleTable, condicionesTable, metodoPagoTable } from './sections/contractTerms';

/**
 * Shape produced by `composeCoverPage`. Holds the document body (ordered list of
 * paragraphs and tables) plus the resolved header text. This is the object tests
 * snapshot against — small, deterministic, and focused on the content we produce
 * rather than the OOXML infrastructure the `docx` library scaffolds inside a
 * `Document`.
 */
export interface CoverPageComposed {
  body: (Paragraph | Table)[];
  headerText: string;
}

/**
 * Build the ordered list of paragraphs and tables that make up the cover page
 * body (titles → actor tables → guarantor-property tables → condiciones →
 * inmueble / condiciones / método de pago tables), plus the header text.
 *
 * No Document / Header / Footer / Packer — those live in `buildCoverPageDocument`.
 */
export function composeCoverPage(data: CoverPageData): CoverPageComposed {
  const cp = t.pages.documents.coverPage;
  const body: (Paragraph | Table)[] = [];

  body.push(new Paragraph({
    children: [txt(cp.titles.contract, true, SZ_TITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: SPACING.titleAfter },
  }));
  body.push(blankLine());
  body.push(new Paragraph({
    children: [txt(cp.titles.caratula, true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: SPACING.titleAfter },
  }));
  body.push(blankLine());
  body.push(new Paragraph({
    children: [txt(cp.titles.partes, true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: SPACING.subtitleAfter },
  }));

  const allActors = [
    ...data.landlords,
    ...data.tenants,
    ...data.jointObligors,
    ...data.avals,
  ];
  for (const actor of allActors) {
    body.push(actorTable(actor));
    body.push(gap());
  }

  for (const prop of data.guarantorProperties) {
    body.push(guarantorPropertyTable(prop));
    body.push(gap());
  }

  body.push(new Paragraph({
    children: [txt(cp.titles.condicionesDelArrendamiento, true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { before: SPACING.condicionesBefore, after: SPACING.subtitleAfter },
  }));
  body.push(inmuebleTable(data));
  body.push(gap());
  body.push(condicionesTable(data));
  body.push(gap());
  body.push(metodoPagoTable(data));

  // Header: "<policyNumber> - <YYYYMMDD>" matching the real sample contracts.
  const headerDate = yyyymmdd(data.contractStartDateRaw);
  const headerText = headerDate ? `${data.policyNumber} - ${headerDate}` : data.policyNumber;

  return { body, headerText };
}

/**
 * Build the full `docx` Document (body + header + footer) ready for packing.
 */
export function buildCoverPageDocument(data: CoverPageData): Document {
  const cp = t.pages.documents.coverPage;
  const { body, headerText } = composeCoverPage(data);

  const header = new Header({
    children: [new Paragraph({
      children: [txt(headerText, false, SZ_SMALL)],
      alignment: AlignmentType.RIGHT,
    })],
  });

  const footer = new Footer({
    children: [new Paragraph({
      children: [
        txt(cp.footer.pagePrefix, false, SZ_SMALL),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ_SMALL }),
        txt(cp.footer.pageJoin, false, SZ_SMALL),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: SZ_SMALL }),
      ],
      alignment: AlignmentType.RIGHT,
    })],
  });

  return new Document({
    sections: [{
      properties: { page: { margin: PAGE_MARGINS } },
      headers: { default: header },
      footers: { default: footer },
      children: body,
    }],
    styles: {
      default: {
        document: { run: { font: FONT, size: SZ } },
      },
    },
  });
}

export async function renderCoverPageDocx(data: CoverPageData): Promise<Buffer> {
  const doc = buildCoverPageDocument(data);
  return Buffer.from(await Packer.toBuffer(doc));
}
