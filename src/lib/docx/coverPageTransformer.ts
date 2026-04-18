/**
 * Transform a `PolicyForCover` (Prisma-direct) into `CoverPageData` for the .docx
 * cover page. Replaces the earlier PDF-pipeline double-transformation.
 */

import type {
  PolicyForCover,
  CoverLandlord,
  CoverTenant,
  CoverJointObligor,
  CoverAval,
} from '@/lib/services/policyService';
import type {
  CoverPageData,
  CoverActorData,
  CoverGuarantorProperty,
  CoverContractTerms,
} from './types';
import { amountToSpanishLegal } from './numberToSpanishWords';
import { dateToSpanishLong } from './dateToSpanishLong';
import { BLANK, NA } from './coverPageDefaults';
import { t } from '@/lib/i18n';
import { formatFullName } from '@/lib/utils/names';
import { formatAddress } from '@/lib/utils/formatting';
import { formatCurrency } from '@/lib/utils/currency';

type AnyCoverActor = CoverLandlord | CoverTenant | CoverJointObligor | CoverAval;
type PropertyGuarantorActor = CoverJointObligor | CoverAval;

function val(v: string | null | undefined): string {
  return v || BLANK;
}

function formatActorLabel(base: string, index: number, total: number): string {
  return total > 1 ? `${base} ${index + 1}.` : `${base}.`;
}

function resolveIsCompany(actor: AnyCoverActor): boolean {
  if ('isCompany' in actor) return actor.isCompany ?? false;
  if ('tenantType' in actor) return actor.tenantType === 'COMPANY';
  if ('jointObligorType' in actor) return actor.jointObligorType === 'COMPANY';
  if ('avalType' in actor) return actor.avalType === 'COMPANY';
  return false;
}

function resolveActorName(actor: AnyCoverActor, isCompany: boolean): string {
  if (isCompany) return actor.companyName || BLANK;
  return formatFullName(
    actor.firstName || '',
    actor.paternalLastName || '',
    actor.maternalLastName || '',
    actor.middleName || '',
  ) || BLANK;
}

function resolveLegalRepName(actor: AnyCoverActor): string {
  return formatFullName(
    actor.legalRepFirstName || '',
    actor.legalRepPaternalLastName || '',
    actor.legalRepMaternalLastName || '',
    actor.legalRepMiddleName || '',
  ) || BLANK;
}

function resolveNationality(actor: AnyCoverActor, isCompany: boolean): string {
  const cp = t.pages.documents.coverPage.nationality;
  if (isCompany) return cp.companyDefault;
  const nat = 'nationality' in actor ? actor.nationality : null;
  if (!nat || nat === 'MEXICAN') return cp.individualDefault;
  // Preserves previous behaviour for FOREIGN: emit a raw Spanish string; the
  // generated carátula is reviewed by staff before sending, so the awkward case
  // is caught there. Upgrading this to a localised label is out of scope here.
  if (nat === 'FOREIGN') return 'Extranjero';
  return cp.individualDefault;
}

function resolveRfc(actor: AnyCoverActor): string {
  // Prefer the personal RFC; fall back to the company RFC if populated.
  return actor.rfc || actor.companyRfc || BLANK;
}

function addressOf(details: { formattedAddress?: string | null } | Parameters<typeof formatAddress>[0] | null | undefined): string {
  const formatted = formatAddress(details ?? null);
  return formatted === '-' ? BLANK : formatted;
}

function transformActor(actor: AnyCoverActor, label: string): CoverActorData {
  const isCompany = resolveIsCompany(actor);
  return {
    label,
    isCompany,
    name: resolveActorName(actor, isCompany),
    nationality: resolveNationality(actor, isCompany),
    address: addressOf(actor.addressDetails),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: resolveRfc(actor),
    curp: 'curp' in actor ? val(actor.curp) : BLANK,
    email: val(actor.email),
    phone: val(actor.phone),
    constitutionDeed: BLANK,
    constitutionDate: BLANK,
    constitutionNotary: BLANK,
    constitutionNotaryNumber: BLANK,
    registryCity: BLANK,
    registryFolio: BLANK,
    registryDate: BLANK,
    legalRepName: resolveLegalRepName(actor),
    legalRepPosition: val(actor.legalRepPosition),
    legalRepIdentificationType: BLANK,
    legalRepIdentificationNumber: BLANK,
    legalRepAddress: BLANK,
    legalRepPhone: val(actor.legalRepPhone),
    legalRepRfc: val(actor.legalRepRfc),
    legalRepCurp: BLANK,
    legalRepEmail: val(actor.legalRepEmail),
    legalRepWorkEmail: BLANK,
    powerDeed: BLANK,
    powerDate: BLANK,
    powerNotary: BLANK,
    powerNotaryNumber: BLANK,
  };
}

/**
 * Emit a second cover actor for the spouse of a married guarantor — but only
 * when the guarantor's property is the basis for the guarantee (community
 * property regime) and all three spouse identity fields are populated.
 * The spouse inherits the primary's postal address; everything else falls back
 * to blanks that the internal review team fills in before sending.
 */
function shouldEmitSpouse(actor: PropertyGuarantorActor): boolean {
  return (
    actor.hasPropertyGuarantee === true &&
    actor.maritalStatus === 'MARRIED' &&
    !!actor.spouseName &&
    !!actor.spouseRfc &&
    !!actor.spouseCurp
  );
}

function spouseAsCoverActor(primary: PropertyGuarantorActor, label: string): CoverActorData {
  return {
    label,
    isCompany: false,
    name: primary.spouseName || BLANK,
    nationality: t.pages.documents.coverPage.nationality.individualDefault,
    address: addressOf(primary.addressDetails),
    identificationType: BLANK,
    identificationNumber: BLANK,
    rfc: primary.spouseRfc || BLANK,
    curp: primary.spouseCurp || BLANK,
    email: BLANK,
    phone: BLANK,
    constitutionDeed: BLANK,
    constitutionDate: BLANK,
    constitutionNotary: BLANK,
    constitutionNotaryNumber: BLANK,
    registryCity: BLANK,
    registryFolio: BLANK,
    registryDate: BLANK,
    legalRepName: BLANK,
    legalRepPosition: BLANK,
    legalRepIdentificationType: BLANK,
    legalRepIdentificationNumber: BLANK,
    legalRepAddress: BLANK,
    legalRepPhone: BLANK,
    legalRepRfc: BLANK,
    legalRepCurp: BLANK,
    legalRepEmail: BLANK,
    legalRepWorkEmail: BLANK,
    powerDeed: BLANK,
    powerDate: BLANK,
    powerNotary: BLANK,
    powerNotaryNumber: BLANK,
  };
}

function expandActorsWithSpouses<T extends PropertyGuarantorActor>(
  actors: T[],
  baseLabel: string,
): CoverActorData[] {
  // First, materialise the emission order so the total count drives numbering
  // consistently (`Obligado Solidario y Fiador 1.` / `... 2.`).
  type Entry = { primary: T; spouseOf?: T };
  const entries: Entry[] = [];
  for (const actor of actors) {
    entries.push({ primary: actor });
    if (shouldEmitSpouse(actor)) {
      entries.push({ primary: actor, spouseOf: actor });
    }
  }

  const total = entries.length;
  return entries.map((entry, i) => {
    const label = formatActorLabel(baseLabel, i, total);
    return entry.spouseOf
      ? spouseAsCoverActor(entry.spouseOf, label)
      : transformActor(entry.primary, label);
  });
}

function extractGuarantorProperty(actor: PropertyGuarantorActor): CoverGuarantorProperty | null {
  if (!actor.hasPropertyGuarantee) return null;
  return {
    deedNumber: val(actor.propertyDeedNumber),
    deedDate: BLANK,
    notaryNumber: BLANK,
    notaryName: BLANK,
    city: BLANK,
    registryFolio: val(actor.propertyRegistry),
    registryDate: BLANK,
    registryCity: BLANK,
    useHabitacional: false,
    useComercial: false,
    useIndustrial: false,
    address: addressOf(actor.guaranteePropertyDetails),
    landArea: BLANK,
    constructionArea: BLANK,
    boundaries: [],
  };
}

function buildRentDisplay(policy: PolicyForCover): string {
  if (policy.rentAmount === null || policy.rentAmount === undefined) return BLANK;
  const amount = Number(policy.rentAmount);
  if (!Number.isFinite(amount)) return BLANK;
  const formatted = formatCurrency(amount);
  const words = amountToSpanishLegal(amount);
  const suffix = t.pages.documents.coverPage.rent.monthlySuffix;
  return `${formatted} (${words}), ${suffix}`;
}

function buildPaymentMethodDescription(policy: PolicyForCover): string {
  const primaryLandlord = policy.landlords.find((l) => l.isPrimary) ?? policy.landlords[0];
  const method = policy.paymentMethod;
  const mp = t.pages.documents.coverPage.metodoPago;

  if (!method) return BLANK;

  if (method.toLowerCase().includes('transfer') || primaryLandlord?.bankName) {
    const parts = [mp.bankTransfer];
    if (primaryLandlord?.accountHolder) parts.push(`${mp.holder}: ${primaryLandlord.accountHolder}.`);
    if (primaryLandlord?.bankName) parts.push(`${mp.bank}: ${primaryLandlord.bankName}.`);
    if (primaryLandlord?.accountNumber) parts.push(`${mp.account}: ${primaryLandlord.accountNumber}.`);
    if (primaryLandlord?.clabe) parts.push(`${mp.clabe}: ${primaryLandlord.clabe}.`);
    return parts.join('\n');
  }

  return mp.cash;
}

function monthsLabel(count: number): string {
  return `${count} ${count === 1 ? 'mes' : 'meses'}`;
}

function resolvePropertyUse(policy: PolicyForCover): string {
  const type = policy.propertyDetails?.propertyType;
  if (!type) return BLANK;
  const label = t.propertyType[type] || type;
  return `${label}.`;
}

function buildContractTerms(policy: PolicyForCover): CoverContractTerms {
  const maintenanceIsNA = !policy.maintenanceFee || policy.maintenanceIncludedInRent;
  const parkingSpaces = policy.propertyDetails?.parkingSpaces ?? null;
  const parkingIsNA = !parkingSpaces;

  return {
    propertyAddress: addressOf(policy.propertyDetails?.propertyAddressDetails),
    parkingSpaces: parkingIsNA ? NA : String(parkingSpaces),
    propertyUse: resolvePropertyUse(policy),
    rentDisplay: buildRentDisplay(policy),
    securityDeposit: policy.securityDeposit ? monthsLabel(policy.securityDeposit) : BLANK,
    contractLength: policy.contractLength ? `${monthsLabel(policy.contractLength)}.` : BLANK,
    startDate: dateToSpanishLong(policy.activatedAt),
    endDate: dateToSpanishLong(policy.expiresAt),
    deliveryDate: dateToSpanishLong(policy.propertyDetails?.propertyDeliveryDate ?? null),
    maintenanceFee: maintenanceIsNA ? NA : formatCurrency(Number(policy.maintenanceFee)),
    paymentMethodDescription: buildPaymentMethodDescription(policy),
  };
}

function toIsoString(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.toISOString();
}

export function buildCoverPageData(policy: PolicyForCover): CoverPageData {
  const actorLabels = t.pages.documents.coverPage.actorLabels;

  const landlords = policy.landlords.map((l, i) =>
    transformActor(l, formatActorLabel(actorLabels.landlord, i, policy.landlords.length)),
  );
  const tenants = policy.tenant
    ? [transformActor(policy.tenant, formatActorLabel(actorLabels.tenant, 0, 1))]
    : [];
  const jointObligors = expandActorsWithSpouses(policy.jointObligors, actorLabels.jointObligor);
  const avals = expandActorsWithSpouses(policy.avals, actorLabels.aval);

  const guarantorProperties: CoverGuarantorProperty[] = [
    ...policy.jointObligors.map(extractGuarantorProperty).filter(Boolean) as CoverGuarantorProperty[],
    ...policy.avals.map(extractGuarantorProperty).filter(Boolean) as CoverGuarantorProperty[],
  ];

  return {
    policyNumber: policy.policyNumber,
    contractStartDateRaw: toIsoString(policy.activatedAt),
    landlords,
    tenants,
    jointObligors,
    avals,
    guarantorProperties,
    contractTerms: buildContractTerms(policy),
  };
}
