/**
 * Actor section — renders one "Arrendador." / "Arrendatario." / "Obligado Solidario y Fiador."
 * / "Aval." block as a 4-column grid table (label | value | label | value).
 *
 * The layout of each actor variant (individual / company / legal rep) is a flat
 * list of `ActorRowSpec` values — reordering or adding a row is a one-line
 * edit in the spec array. Row spec → `TableRow` conversion lives in
 * `../rowSpec.ts`.
 */

import { Table } from 'docx';
import type { CoverActorData } from '../../types';
import { t } from '@/lib/i18n';
import { sectionTable, companySectionTable } from '../sectionTable';
import { renderActorRow, type ActorRowSpec } from '../rowSpec';

export function individualActorRowSpecs(a: CoverActorData): ActorRowSpec[] {
  const cp = t.pages.documents.coverPage;
  return [
    { kind: 'actor.pair', l1: cp.actor.name, v1: a.name, l2: cp.actor.nationality, v2: a.nationality },
    { kind: 'actor.wide', label: cp.actor.address, value: a.address },
    { kind: 'actor.pair', l1: cp.actor.identification, v1: a.identificationType, l2: cp.actor.identificationNumber, v2: a.identificationNumber },
    { kind: 'actor.pair', l1: cp.actor.rfc, v1: a.rfc, l2: cp.actor.curp, v2: a.curp },
    { kind: 'actor.pair', l1: cp.actor.email, v1: a.email, l2: cp.actor.phone, v2: a.phone },
  ];
}

export function companyActorRowSpecs(a: CoverActorData): ActorRowSpec[] {
  const cp = t.pages.documents.coverPage;
  return [
    { kind: 'actor.pair', l1: cp.actor.denomination, v1: a.name, l2: cp.actor.nationality, v2: a.nationality },
    { kind: 'actor.wide', label: cp.actor.address, value: a.address },
    { kind: 'actor.wide', label: cp.actor.rfc, value: a.rfc },
    { kind: 'actor.subHeader', text: cp.constitution.subHeader },
    { kind: 'actor.pair', l1: cp.constitution.deed, v1: a.constitutionDeed, l2: cp.constitution.date, v2: a.constitutionDate },
    { kind: 'actor.pair', l1: cp.constitution.notary, v1: a.constitutionNotary, l2: cp.constitution.notaryNumber, v2: a.constitutionNotaryNumber },
    { kind: 'actor.wide', label: cp.constitution.registry, value: a.registryCity },
    { kind: 'actor.pair', l1: cp.constitution.registryFolio, v1: a.registryFolio, l2: cp.constitution.registryDate, v2: a.registryDate },
  ];
}

export function legalRepRowSpecs(a: CoverActorData): ActorRowSpec[] {
  const cp = t.pages.documents.coverPage;
  return [
    { kind: 'actor.pair', l1: cp.legalRep.name, v1: a.legalRepName, l2: cp.legalRep.position, v2: a.legalRepPosition },
    { kind: 'actor.pair', l1: cp.legalRep.identification, v1: a.legalRepIdentificationType, l2: cp.legalRep.identificationNumber, v2: a.legalRepIdentificationNumber },
    { kind: 'actor.pair', l1: cp.legalRep.address, v1: a.legalRepAddress, l2: cp.legalRep.phone, v2: a.legalRepPhone },
    { kind: 'actor.pair', l1: cp.legalRep.rfc, v1: a.legalRepRfc, l2: cp.legalRep.curp, v2: a.legalRepCurp },
    { kind: 'actor.pair', l1: cp.legalRep.emailWork, v1: a.legalRepWorkEmail, l2: cp.legalRep.emailPersonal, v2: a.legalRepEmail },
    { kind: 'actor.subHeader', text: cp.powerOfAttorney.subHeader },
    { kind: 'actor.pair', l1: cp.powerOfAttorney.deed, v1: a.powerDeed, l2: cp.powerOfAttorney.date, v2: a.powerDate },
    { kind: 'actor.pair', l1: cp.powerOfAttorney.notary, v1: a.powerNotary, l2: cp.powerOfAttorney.notaryNumber, v2: a.powerNotaryNumber },
  ];
}

export function actorTable(actor: CoverActorData): Table {
  const cp = t.pages.documents.coverPage;
  if (actor.isCompany) {
    return companySectionTable(
      actor.label,
      companyActorRowSpecs(actor).map(renderActorRow),
      cp.legalRep.sectionLabel,
      cp.legalRep.sectionLabel,
      legalRepRowSpecs(actor).map(renderActorRow),
    );
  }
  return sectionTable(actor.label, individualActorRowSpecs(actor).map(renderActorRow));
}
