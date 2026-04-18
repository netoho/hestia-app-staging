/**
 * Actor section — renders one "Arrendador." / "Arrendatario." / "Obligado Solidario y Fiador."
 * / "Aval." block as a 4-column grid table (label | value | label | value).
 *
 * Individual actors use a single inner table; company actors use the company-section wrapper
 * that stacks the constitution block and the legal-representative block with a full-width
 * "Representante Legal." bridge row.
 */

import {
  TableRow,
  TableCell,
  Table,
  WidthType,
  VerticalAlign,
  HeightRule,
  AlignmentType,
  ShadingType,
} from 'docx';
import type { CoverActorData } from '../../types';
import { t } from '@/lib/i18n';
import {
  A_L,
  A_V,
  ROW_HEIGHT_MIN,
  LABEL_BG,
  CELL_MARGINS,
  SZ,
} from '../styles';
import { para } from '../helpers';
import { lblCell, valCell } from '../cells';
import { sectionTable, companySectionTable } from '../sectionTable';

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

function individualActorRows(a: CoverActorData): TableRow[] {
  const cp = t.pages.documents.coverPage;
  return [
    aRow2(cp.actor.name, a.name, cp.actor.nationality, a.nationality),
    aRow1(cp.actor.address, a.address),
    aRow2(cp.actor.identification, a.identificationType, cp.actor.identificationNumber, a.identificationNumber),
    aRow2(cp.actor.rfc, a.rfc, cp.actor.curp, a.curp),
    aRow2(cp.actor.email, a.email, cp.actor.phone, a.phone),
  ];
}

function companyActorRows(a: CoverActorData): TableRow[] {
  const cp = t.pages.documents.coverPage;
  return [
    aRow2(cp.actor.denomination, a.name, cp.actor.nationality, a.nationality),
    aRow1(cp.actor.address, a.address),
    aRow1(cp.actor.rfc, a.rfc),
    aRowSubHeader(cp.constitution.subHeader),
    aRow2(cp.constitution.deed, a.constitutionDeed, cp.constitution.date, a.constitutionDate),
    aRow2(cp.constitution.notary, a.constitutionNotary, cp.constitution.notaryNumber, a.constitutionNotaryNumber),
    aRow1(cp.constitution.registry, a.registryCity),
    aRow2(cp.constitution.registryFolio, a.registryFolio, cp.constitution.registryDate, a.registryDate),
  ];
}

function legalRepRows(a: CoverActorData): TableRow[] {
  const cp = t.pages.documents.coverPage;
  return [
    aRow2(cp.legalRep.name, a.legalRepName, cp.legalRep.position, a.legalRepPosition),
    aRow2(cp.legalRep.identification, a.legalRepIdentificationType, cp.legalRep.identificationNumber, a.legalRepIdentificationNumber),
    aRow2(cp.legalRep.address, a.legalRepAddress, cp.legalRep.phone, a.legalRepPhone),
    aRow2(cp.legalRep.rfc, a.legalRepRfc, cp.legalRep.curp, a.legalRepCurp),
    aRow2(cp.legalRep.emailWork, a.legalRepWorkEmail, cp.legalRep.emailPersonal, a.legalRepEmail),
    aRowSubHeader(cp.powerOfAttorney.subHeader),
    aRow2(cp.powerOfAttorney.deed, a.powerDeed, cp.powerOfAttorney.date, a.powerDate),
    aRow2(cp.powerOfAttorney.notary, a.powerNotary, cp.powerOfAttorney.notaryNumber, a.powerNotaryNumber),
  ];
}

export function actorTable(actor: CoverActorData): Table {
  const cp = t.pages.documents.coverPage;
  if (actor.isCompany) {
    return companySectionTable(
      actor.label,
      companyActorRows(actor),
      cp.legalRep.sectionLabel,
      cp.legalRep.sectionLabel,
      legalRepRows(actor),
    );
  }
  return sectionTable(actor.label, individualActorRows(actor));
}
