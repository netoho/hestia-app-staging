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
import { txt, gap } from './helpers';
import { actorTable } from './sections/actor';
import { guarantorPropertyTable } from './sections/guarantorProperty';
import { inmuebleTable, condicionesTable, metodoPagoTable } from './sections/contractTerms';

export async function renderCoverPageDocx(data: CoverPageData): Promise<Buffer> {
  const cp = t.pages.documents.coverPage;
  const children: (Paragraph | Table)[] = [];

  children.push(new Paragraph({
    children: [txt(cp.titles.contract, true, SZ_TITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: SPACING.titleAfter },
  }));
  children.push(new Paragraph({
    children: [txt(cp.titles.caratula, true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: SPACING.titleAfter },
  }));
  children.push(new Paragraph({
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
    children.push(actorTable(actor));
    children.push(gap());
  }

  for (const prop of data.guarantorProperties) {
    children.push(guarantorPropertyTable(prop));
    children.push(gap());
  }

  children.push(new Paragraph({
    children: [txt(cp.titles.condicionesDelArrendamiento, true, SZ_SUBTITLE)],
    alignment: AlignmentType.CENTER,
    spacing: { before: SPACING.condicionesBefore, after: SPACING.subtitleAfter },
  }));
  children.push(inmuebleTable(data));
  children.push(gap());
  children.push(condicionesTable(data));
  children.push(gap());
  children.push(metodoPagoTable(data));

  // Header: "<policyNumber> - <YYYYMMDD>" matching the real sample contracts.
  const headerDate = yyyymmdd(data.contractStartDateRaw);
  const headerText = headerDate ? `${data.policyNumber} - ${headerDate}` : data.policyNumber;
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

  const doc = new Document({
    sections: [{
      properties: { page: { margin: PAGE_MARGINS } },
      headers: { default: header },
      footers: { default: footer },
      children,
    }],
    styles: {
      default: {
        document: { run: { font: FONT, size: SZ } },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
