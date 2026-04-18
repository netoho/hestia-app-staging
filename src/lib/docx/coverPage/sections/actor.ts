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

export function actorTable(actor: CoverActorData): Table {
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
