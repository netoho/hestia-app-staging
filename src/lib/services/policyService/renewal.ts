import prisma from '@/lib/prisma';
import {
  PolicyStatus,
  ActorInvestigationStatus,
  InvestigationArchiveReason,
  DocumentUploadStatus,
} from '@/prisma/generated/prisma-client/enums';
import { documentService } from '@/lib/services/documentService';
import { getStorageProvider } from '@/lib/storage';
import { generatePolicyActorTokens } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from './index';
import type { PolicyRenewalSelection } from '@/lib/schemas/policy/renewalSelection';

export interface CloneForRenewalInput {
  sourcePolicyId: string;
  selection: PolicyRenewalSelection;
  startDate: Date | string;
  endDate: Date | string;
  initiatedById: string;
}

export interface CloneForRenewalResult {
  newPolicyId: string;
  newPolicyNumber: string;
  documentsCopied: number;
  documentsFailed: number;
}

const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
};

function makeBlankIfNotSelected<T>(value: T, selected: boolean, blank: T): T {
  return selected ? value : blank;
}

type AnyTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function duplicateAddress(tx: AnyTx, sourceId: string | null | undefined): Promise<string | null> {
  if (!sourceId) return null;
  const src = await tx.propertyAddress.findUnique({ where: { id: sourceId } });
  if (!src) return null;

  const created = await tx.propertyAddress.create({
    data: {
      street: src.street,
      exteriorNumber: src.exteriorNumber,
      interiorNumber: src.interiorNumber,
      neighborhood: src.neighborhood,
      postalCode: src.postalCode,
      municipality: src.municipality,
      city: src.city,
      state: src.state,
      country: src.country,
      placeId: src.placeId,
      latitude: src.latitude,
      longitude: src.longitude,
      formattedAddress: src.formattedAddress,
    },
  });
  return created.id;
}

/**
 * Clone a source policy into a new renewal policy. See
 * /Users/neto/.claude/plans/policy-renewal-clone-feature.md for the full design.
 *
 * Flow:
 *   1. DB transaction — addresses, policy, actors, property, refs, investigations,
 *      renewedToId link.
 *   2. After commit — S3 copies for selected documents, token generation, activity logs.
 */
export async function clonePolicyForRenewal(
  input: CloneForRenewalInput,
): Promise<CloneForRenewalResult> {
  const { sourcePolicyId, selection, initiatedById } = input;
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  const source = await prisma.policy.findUnique({
    where: { id: sourcePolicyId },
    include: {
      landlords: {
        where: { isPrimary: true },
        include: {
          addressDetails: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
        },
      },
      tenant: {
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          previousRentalAddressDetails: true,
          personalReferences: true,
          commercialReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
        },
      },
      jointObligors: {
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          personalReferences: true,
          commercialReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
        },
      },
      avals: {
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          guaranteePropertyDetails: true,
          personalReferences: true,
          commercialReferences: true,
          documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
        },
      },
      propertyDetails: {
        include: {
          propertyAddressDetails: true,
          contractSigningAddressDetails: true,
        },
      },
      actorInvestigations: true,
    },
  });

  if (!source) throw new Error('Source policy not found');
  if (source.status !== PolicyStatus.ACTIVE && source.status !== PolicyStatus.EXPIRED) {
    throw new Error(`Cannot renew policy in status ${source.status}`);
  }
  if (source.renewedToId) {
    // Overwriting is allowed per product decision; continue but we'll update renewedToId.
  }

  const sourceLandlord = source.landlords[0];
  if (!sourceLandlord) throw new Error('Source policy has no primary landlord');

  const selectedJOs = source.jointObligors.filter((jo) =>
    selection.jointObligors.find((s) => s.sourceId === jo.id && s.include),
  );
  const selectedAvals = source.avals.filter((av) =>
    selection.avals.find((s) => s.sourceId === av.id && s.include),
  );

  // ============================================================
  // 1. DB TRANSACTION
  // ============================================================
  const txResult = await prisma.$transaction(
    async (tx) => {
      // ---- Landlord address ----
      const newLandlordAddressId =
        selection.landlord.include && selection.landlord.address
          ? await duplicateAddress(tx, sourceLandlord.addressId)
          : null;

      // ---- Tenant addresses ----
      const newTenantAddressId =
        selection.tenant.include && selection.tenant.address
          ? await duplicateAddress(tx, source.tenant?.addressId)
          : null;
      const newTenantEmployerAddressId =
        selection.tenant.include && selection.tenant.employment
          ? await duplicateAddress(tx, source.tenant?.employerAddressId)
          : null;
      const newTenantPreviousAddressId =
        selection.tenant.include && selection.tenant.rentalHistory
          ? await duplicateAddress(tx, source.tenant?.previousRentalAddressId)
          : null;

      // ---- Property addresses ----
      const newPropertyAddressId =
        selection.property.address
          ? await duplicateAddress(tx, source.propertyDetails?.propertyAddressId)
          : null;
      const newContractSigningAddressId =
        selection.property.address
          ? await duplicateAddress(tx, source.propertyDetails?.contractSigningAddressId)
          : null;

      // ---- Compute new policyNumber ----
      const now = new Date();
      const stamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
        .getDate()
        .toString()
        .padStart(2, '0')}`;
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const policyNumber = `POL-${stamp}-${suffix}`;

      // ---- Landlord field picks (gated by sub-checkboxes) ----
      const ld = sourceLandlord;
      const keepBasic = selection.landlord.include && selection.landlord.basicInfo;
      const keepContact = selection.landlord.include && selection.landlord.contact;
      const keepBanking = selection.landlord.include && selection.landlord.banking;
      const keepPropertyDeed = selection.landlord.include && selection.landlord.propertyDeed;
      const keepCfdi = selection.landlord.include && selection.landlord.cfdi;

      const landlordData = {
        isPrimary: true,
        isCompany: keepBasic ? ld.isCompany : false,
        firstName: keepBasic ? ld.firstName : null,
        middleName: keepBasic ? ld.middleName : null,
        paternalLastName: keepBasic ? ld.paternalLastName : null,
        maternalLastName: keepBasic ? ld.maternalLastName : null,
        rfc: keepBasic ? ld.rfc : null,
        curp: keepBasic ? ld.curp : null,
        companyName: keepBasic ? ld.companyName : null,
        companyRfc: keepBasic ? ld.companyRfc : null,
        businessType: keepBasic ? ld.businessType : null,
        legalRepFirstName: keepBasic ? ld.legalRepFirstName : null,
        legalRepMiddleName: keepBasic ? ld.legalRepMiddleName : null,
        legalRepPaternalLastName: keepBasic ? ld.legalRepPaternalLastName : null,
        legalRepMaternalLastName: keepBasic ? ld.legalRepMaternalLastName : null,
        legalRepPosition: keepBasic ? ld.legalRepPosition : null,
        legalRepRfc: keepBasic ? ld.legalRepRfc : null,
        legalRepCurp: keepBasic ? ld.legalRepCurp : null,
        legalRepPhone: keepContact ? ld.legalRepPhone : null,
        legalRepEmail: keepContact ? ld.legalRepEmail : null,
        email: keepContact && ld.email ? ld.email : ld.email || '',
        phone: keepContact && ld.phone ? ld.phone : '',
        workPhone: keepContact ? ld.workPhone : null,
        personalEmail: keepContact ? ld.personalEmail : null,
        workEmail: keepContact ? ld.workEmail : null,
        address: '',
        addressId: newLandlordAddressId,
        bankName: keepBanking ? ld.bankName : null,
        accountNumber: keepBanking ? ld.accountNumber : null,
        clabe: keepBanking ? ld.clabe : null,
        accountHolder: keepBanking ? ld.accountHolder : null,
        occupation: keepBasic ? ld.occupation : null,
        employerName: keepBasic ? ld.employerName : null,
        monthlyIncome: keepBasic ? ld.monthlyIncome : null,
        propertyDeedNumber: keepPropertyDeed ? ld.propertyDeedNumber : null,
        propertyRegistryFolio: keepPropertyDeed ? ld.propertyRegistryFolio : null,
        requiresCFDI: keepCfdi ? ld.requiresCFDI : false,
        cfdiData: keepCfdi ? ld.cfdiData : null,
        additionalInfo: keepBasic ? ld.additionalInfo : null,
        informationComplete: false,
        verificationStatus: 'PENDING' as const,
      };

      // ---- Tenant field picks ----
      const t = source.tenant;
      const tKeepBasic = t && selection.tenant.include && selection.tenant.basicInfo;
      const tKeepContact = t && selection.tenant.include && selection.tenant.contact;
      const tKeepEmployment = t && selection.tenant.include && selection.tenant.employment;
      const tKeepRentalHistory = t && selection.tenant.include && selection.tenant.rentalHistory;
      const tKeepPayment = t && selection.tenant.include && selection.tenant.paymentPreferences;

      const tenantData = t
        ? {
            tenantType: tKeepBasic ? t.tenantType : 'INDIVIDUAL',
            firstName: tKeepBasic ? t.firstName : null,
            middleName: tKeepBasic ? t.middleName : null,
            paternalLastName: tKeepBasic ? t.paternalLastName : null,
            maternalLastName: tKeepBasic ? t.maternalLastName : null,
            nationality: tKeepBasic ? t.nationality : 'MEXICAN',
            curp: tKeepBasic ? t.curp : null,
            rfc: tKeepBasic ? t.rfc : null,
            passport: tKeepBasic ? t.passport : null,
            companyName: tKeepBasic ? t.companyName : null,
            companyRfc: tKeepBasic ? t.companyRfc : null,
            legalRepFirstName: tKeepBasic ? t.legalRepFirstName : null,
            legalRepMiddleName: tKeepBasic ? t.legalRepMiddleName : null,
            legalRepPaternalLastName: tKeepBasic ? t.legalRepPaternalLastName : null,
            legalRepMaternalLastName: tKeepBasic ? t.legalRepMaternalLastName : null,
            legalRepId: tKeepBasic ? t.legalRepId : null,
            legalRepPosition: tKeepBasic ? t.legalRepPosition : null,
            legalRepRfc: tKeepBasic ? t.legalRepRfc : null,
            legalRepPhone: tKeepContact ? t.legalRepPhone : null,
            legalRepEmail: tKeepContact ? t.legalRepEmail : null,
            email: tKeepContact ? t.email : t.email || '',
            phone: tKeepContact ? t.phone : '',
            workPhone: tKeepContact ? t.workPhone : null,
            personalEmail: tKeepContact ? t.personalEmail : null,
            workEmail: tKeepContact ? t.workEmail : null,
            currentAddress: null,
            addressId: newTenantAddressId,
            employmentStatus: tKeepEmployment ? t.employmentStatus : null,
            occupation: tKeepEmployment ? t.occupation : null,
            employerName: tKeepEmployment ? t.employerName : null,
            employerAddressId: newTenantEmployerAddressId,
            position: tKeepEmployment ? t.position : null,
            monthlyIncome: tKeepEmployment ? t.monthlyIncome : null,
            incomeSource: tKeepEmployment ? t.incomeSource : null,
            yearsAtJob: tKeepEmployment ? t.yearsAtJob : null,
            hasAdditionalIncome: tKeepEmployment ? t.hasAdditionalIncome : false,
            additionalIncomeSource: tKeepEmployment ? t.additionalIncomeSource : null,
            additionalIncomeAmount: tKeepEmployment ? t.additionalIncomeAmount : null,
            previousLandlordName: tKeepRentalHistory ? t.previousLandlordName : null,
            previousLandlordPhone: tKeepRentalHistory ? t.previousLandlordPhone : null,
            previousLandlordEmail: tKeepRentalHistory ? t.previousLandlordEmail : null,
            previousRentAmount: tKeepRentalHistory ? t.previousRentAmount : null,
            previousRentalAddressId: newTenantPreviousAddressId,
            rentalHistoryYears: tKeepRentalHistory ? t.rentalHistoryYears : null,
            numberOfOccupants: tKeepRentalHistory ? t.numberOfOccupants : null,
            reasonForMoving: tKeepRentalHistory ? t.reasonForMoving : null,
            hasPets: tKeepRentalHistory ? t.hasPets : false,
            petDescription: tKeepRentalHistory ? t.petDescription : null,
            paymentMethod: tKeepPayment ? t.paymentMethod : null,
            requiresCFDI: tKeepPayment ? t.requiresCFDI : false,
            cfdiData: tKeepPayment ? t.cfdiData : null,
            additionalInfo: tKeepBasic ? t.additionalInfo : null,
            informationComplete: false,
            verificationStatus: 'PENDING' as const,
          }
        : null;

      // ---- Policy terms (gated by sub-checkboxes) ----
      const terms = selection.policyTerms;
      const keepFinancial = terms.financial;
      const keepContract = terms.contract;
      const keepPackaging = terms.packageAndPricing;

      // ---- Create new policy with nested landlord + tenant ----
      const newPolicy = await tx.policy.create({
        data: {
          policyNumber,
          internalCode: null,
          rentAmount: keepFinancial ? source.rentAmount : 0,
          contractLength: keepContract ? source.contractLength : 12,
          guarantorType: terms.guarantorType,
          packageId: keepPackaging ? source.packageId : null,
          totalPrice: keepPackaging ? source.totalPrice : 0,
          tenantPercentage: keepPackaging ? source.tenantPercentage : 100,
          landlordPercentage: keepPackaging ? source.landlordPercentage : 0,
          tenantPaymentMethod: keepContract ? source.tenantPaymentMethod : null,
          tenantRequiresCFDI: keepContract ? source.tenantRequiresCFDI : false,
          tenantCFDIData: keepContract ? source.tenantCFDIData : null,
          hasIVA: keepFinancial ? source.hasIVA : false,
          issuesTaxReceipts: keepFinancial ? source.issuesTaxReceipts : false,
          securityDeposit: keepFinancial ? source.securityDeposit : null,
          maintenanceFee: keepFinancial ? source.maintenanceFee : null,
          maintenanceIncludedInRent: keepFinancial ? source.maintenanceIncludedInRent : false,
          rentIncreasePercentage: keepFinancial ? source.rentIncreasePercentage : null,
          paymentMethod: keepContract ? source.paymentMethod : null,
          createdById: initiatedById,
          managedById: source.managedById,
          status: PolicyStatus.COLLECTING_INFO,
          activatedAt: startDate,
          expiresAt: endDate,
          landlords: { create: landlordData },
          ...(tenantData ? { tenant: { create: tenantData } } : {}),
        },
        include: { landlords: true, tenant: true },
      });

      // ---- Property details ----
      const prop = source.propertyDetails;
      if (prop) {
        const keepTypeDesc = selection.property.typeAndDescription;
        const keepFeatures = selection.property.features;
        const keepServices = selection.property.services;

        await tx.propertyDetails.create({
          data: {
            policyId: newPolicy.id,
            propertyType: keepTypeDesc ? prop.propertyType : null,
            propertyDescription: keepTypeDesc ? prop.propertyDescription : null,
            propertyAddressId: newPropertyAddressId,
            contractSigningAddressId: newContractSigningAddressId,
            parkingSpaces: keepFeatures ? prop.parkingSpaces : null,
            parkingNumbers: keepFeatures ? prop.parkingNumbers : null,
            isFurnished: keepFeatures ? prop.isFurnished : false,
            hasInventory: keepFeatures ? prop.hasInventory : false,
            hasRules: keepFeatures ? prop.hasRules : false,
            rulesType: keepFeatures ? prop.rulesType : null,
            petsAllowed: keepFeatures ? prop.petsAllowed : false,
            propertyDeliveryDate: keepFeatures ? prop.propertyDeliveryDate : null,
            contractSigningDate: keepFeatures ? prop.contractSigningDate : null,
            hasPhone: keepServices ? prop.hasPhone : false,
            hasElectricity: keepServices ? prop.hasElectricity : true,
            hasWater: keepServices ? prop.hasWater : true,
            hasGas: keepServices ? prop.hasGas : false,
            hasCableTV: keepServices ? prop.hasCableTV : false,
            hasInternet: keepServices ? prop.hasInternet : false,
            otherServices: keepServices ? prop.otherServices : null,
            utilitiesInLandlordName: keepServices ? prop.utilitiesInLandlordName : false,
            electricityIncludedInRent: keepServices ? prop.electricityIncludedInRent : false,
            waterIncludedInRent: keepServices ? prop.waterIncludedInRent : false,
            gasIncludedInRent: keepServices ? prop.gasIncludedInRent : false,
            internetIncludedInRent: keepServices ? prop.internetIncludedInRent : false,
            cableTVIncludedInRent: keepServices ? prop.cableTVIncludedInRent : false,
            phoneIncludedInRent: keepServices ? prop.phoneIncludedInRent : false,
          },
        });
      }

      // ---- Joint obligors ----
      const joIdMap: Array<{ sourceId: string; newId: string }> = [];
      for (const jo of selectedJOs) {
        const sel = selection.jointObligors.find((s) => s.sourceId === jo.id)!;
        const addrId =
          sel.address ? await duplicateAddress(tx, jo.addressId) : null;
        const empAddrId =
          sel.employment ? await duplicateAddress(tx, jo.employerAddressId) : null;
        const guarantAddrId =
          sel.guarantee ? await duplicateAddress(tx, jo.guaranteePropertyAddressId) : null;

        const created = await tx.jointObligor.create({
          data: {
            policyId: newPolicy.id,
            jointObligorType: sel.basicInfo ? jo.jointObligorType : 'INDIVIDUAL',
            firstName: sel.basicInfo ? jo.firstName : null,
            middleName: sel.basicInfo ? jo.middleName : null,
            paternalLastName: sel.basicInfo ? jo.paternalLastName : null,
            maternalLastName: sel.basicInfo ? jo.maternalLastName : null,
            nationality: sel.basicInfo ? jo.nationality : 'MEXICAN',
            curp: sel.basicInfo ? jo.curp : null,
            rfc: sel.basicInfo ? jo.rfc : null,
            passport: sel.basicInfo ? jo.passport : null,
            relationshipToTenant: sel.basicInfo ? jo.relationshipToTenant : null,
            companyName: sel.basicInfo ? jo.companyName : null,
            companyRfc: sel.basicInfo ? jo.companyRfc : null,
            legalRepFirstName: sel.basicInfo ? jo.legalRepFirstName : null,
            legalRepMiddleName: sel.basicInfo ? jo.legalRepMiddleName : null,
            legalRepPaternalLastName: sel.basicInfo ? jo.legalRepPaternalLastName : null,
            legalRepMaternalLastName: sel.basicInfo ? jo.legalRepMaternalLastName : null,
            legalRepPosition: sel.basicInfo ? jo.legalRepPosition : null,
            legalRepRfc: sel.basicInfo ? jo.legalRepRfc : null,
            legalRepPhone: sel.contact ? jo.legalRepPhone : null,
            legalRepEmail: sel.contact ? jo.legalRepEmail : null,
            email: sel.contact ? jo.email : jo.email || '',
            phone: sel.contact ? jo.phone : '',
            workPhone: sel.contact ? jo.workPhone : null,
            personalEmail: sel.contact ? jo.personalEmail : null,
            workEmail: sel.contact ? jo.workEmail : null,
            address: null,
            addressId: addrId,
            employmentStatus: sel.employment ? jo.employmentStatus : null,
            occupation: sel.employment ? jo.occupation : null,
            employerName: sel.employment ? jo.employerName : null,
            employerAddressId: empAddrId,
            position: sel.employment ? jo.position : null,
            monthlyIncome: sel.employment ? jo.monthlyIncome : null,
            incomeSource: sel.employment ? jo.incomeSource : null,
            guaranteeMethod: sel.guarantee ? jo.guaranteeMethod : null,
            hasPropertyGuarantee: sel.guarantee ? jo.hasPropertyGuarantee : false,
            propertyAddress: sel.guarantee ? jo.propertyAddress : null,
            guaranteePropertyAddressId: guarantAddrId,
            propertyValue: sel.guarantee ? jo.propertyValue : null,
            propertyDeedNumber: sel.guarantee ? jo.propertyDeedNumber : null,
            propertyRegistry: sel.guarantee ? jo.propertyRegistry : null,
            propertyTaxAccount: sel.guarantee ? jo.propertyTaxAccount : null,
            propertyUnderLegalProceeding: sel.guarantee ? jo.propertyUnderLegalProceeding : false,
            bankName: sel.guarantee ? jo.bankName : null,
            accountHolder: sel.guarantee ? jo.accountHolder : null,
            hasProperties: sel.guarantee ? jo.hasProperties : false,
            maritalStatus: sel.marital ? jo.maritalStatus : null,
            spouseName: sel.marital ? jo.spouseName : null,
            spouseRfc: sel.marital ? jo.spouseRfc : null,
            spouseCurp: sel.marital ? jo.spouseCurp : null,
            additionalInfo: sel.basicInfo ? jo.additionalInfo : null,
            informationComplete: false,
            verificationStatus: 'PENDING',
          },
        });

        joIdMap.push({ sourceId: jo.id, newId: created.id });
      }

      // ---- Avals ----
      const avalIdMap: Array<{ sourceId: string; newId: string }> = [];
      for (const av of selectedAvals) {
        const sel = selection.avals.find((s) => s.sourceId === av.id)!;
        const addrId = sel.address ? await duplicateAddress(tx, av.addressId) : null;
        const empAddrId = sel.employment ? await duplicateAddress(tx, av.employerAddressId) : null;
        const guarantAddrId =
          sel.guaranteeProperty ? await duplicateAddress(tx, av.guaranteePropertyAddressId) : null;

        const created = await tx.aval.create({
          data: {
            policyId: newPolicy.id,
            avalType: sel.basicInfo ? av.avalType : 'INDIVIDUAL',
            firstName: sel.basicInfo ? av.firstName : null,
            middleName: sel.basicInfo ? av.middleName : null,
            paternalLastName: sel.basicInfo ? av.paternalLastName : null,
            maternalLastName: sel.basicInfo ? av.maternalLastName : null,
            nationality: sel.basicInfo ? av.nationality : 'MEXICAN',
            curp: sel.basicInfo ? av.curp : null,
            rfc: sel.basicInfo ? av.rfc : null,
            passport: sel.basicInfo ? av.passport : null,
            relationshipToTenant: sel.basicInfo ? av.relationshipToTenant : null,
            companyName: sel.basicInfo ? av.companyName : null,
            companyRfc: sel.basicInfo ? av.companyRfc : null,
            legalRepFirstName: sel.basicInfo ? av.legalRepFirstName : null,
            legalRepMiddleName: sel.basicInfo ? av.legalRepMiddleName : null,
            legalRepPaternalLastName: sel.basicInfo ? av.legalRepPaternalLastName : null,
            legalRepMaternalLastName: sel.basicInfo ? av.legalRepMaternalLastName : null,
            legalRepPosition: sel.basicInfo ? av.legalRepPosition : null,
            legalRepRfc: sel.basicInfo ? av.legalRepRfc : null,
            legalRepPhone: sel.contact ? av.legalRepPhone : null,
            legalRepEmail: sel.contact ? av.legalRepEmail : null,
            email: sel.contact ? av.email : av.email || '',
            phone: sel.contact ? av.phone : '',
            workPhone: sel.contact ? av.workPhone : null,
            personalEmail: sel.contact ? av.personalEmail : null,
            workEmail: sel.contact ? av.workEmail : null,
            address: null,
            addressId: addrId,
            employmentStatus: sel.employment ? av.employmentStatus : null,
            occupation: sel.employment ? av.occupation : null,
            employerName: sel.employment ? av.employerName : null,
            employerAddressId: empAddrId,
            position: sel.employment ? av.position : null,
            monthlyIncome: sel.employment ? av.monthlyIncome : null,
            incomeSource: sel.employment ? av.incomeSource : null,
            propertyAddress: sel.guaranteeProperty ? av.propertyAddress : null,
            guaranteePropertyAddressId: guarantAddrId,
            propertyValue: sel.guaranteeProperty ? av.propertyValue : null,
            propertyDeedNumber: sel.guaranteeProperty ? av.propertyDeedNumber : null,
            propertyRegistry: sel.guaranteeProperty ? av.propertyRegistry : null,
            propertyTaxAccount: sel.guaranteeProperty ? av.propertyTaxAccount : null,
            propertyUnderLegalProceeding: sel.guaranteeProperty ? av.propertyUnderLegalProceeding : false,
            guaranteeMethod: sel.guaranteeProperty ? av.guaranteeMethod : null,
            hasPropertyGuarantee: sel.guaranteeProperty ? av.hasPropertyGuarantee : true,
            maritalStatus: sel.marital ? av.maritalStatus : null,
            spouseName: sel.marital ? av.spouseName : null,
            spouseRfc: sel.marital ? av.spouseRfc : null,
            spouseCurp: sel.marital ? av.spouseCurp : null,
            additionalInfo: sel.basicInfo ? av.additionalInfo : null,
            informationComplete: false,
            verificationStatus: 'PENDING',
          },
        });

        avalIdMap.push({ sourceId: av.id, newId: created.id });
      }

      // ---- References ----
      // Tenant references
      if (t && tenantData && selection.tenant.include && selection.tenant.references) {
        const newTenant = newPolicy.tenant!;
        for (const r of t.personalReferences) {
          await tx.personalReference.create({
            data: {
              firstName: r.firstName,
              middleName: r.middleName,
              paternalLastName: r.paternalLastName,
              maternalLastName: r.maternalLastName,
              phone: r.phone,
              homePhone: r.homePhone,
              cellPhone: r.cellPhone,
              email: r.email,
              relationship: r.relationship,
              occupation: r.occupation,
              address: r.address,
              tenantId: newTenant.id,
            },
          });
        }
        for (const r of t.commercialReferences) {
          await tx.commercialReference.create({
            data: {
              companyName: r.companyName,
              contactFirstName: r.contactFirstName,
              contactMiddleName: r.contactMiddleName,
              contactPaternalLastName: r.contactPaternalLastName,
              contactMaternalLastName: r.contactMaternalLastName,
              phone: r.phone,
              email: r.email,
              relationship: r.relationship,
              yearsOfRelationship: r.yearsOfRelationship,
              tenantId: newTenant.id,
            },
          });
        }
      }

      // JO references
      for (const { sourceId, newId } of joIdMap) {
        const sel = selection.jointObligors.find((s) => s.sourceId === sourceId)!;
        if (!sel.references) continue;
        const src = selectedJOs.find((x) => x.id === sourceId)!;
        for (const r of src.personalReferences) {
          await tx.personalReference.create({
            data: {
              firstName: r.firstName,
              middleName: r.middleName,
              paternalLastName: r.paternalLastName,
              maternalLastName: r.maternalLastName,
              phone: r.phone,
              homePhone: r.homePhone,
              cellPhone: r.cellPhone,
              email: r.email,
              relationship: r.relationship,
              occupation: r.occupation,
              address: r.address,
              jointObligorId: newId,
            },
          });
        }
        for (const r of src.commercialReferences) {
          await tx.commercialReference.create({
            data: {
              companyName: r.companyName,
              contactFirstName: r.contactFirstName,
              contactMiddleName: r.contactMiddleName,
              contactPaternalLastName: r.contactPaternalLastName,
              contactMaternalLastName: r.contactMaternalLastName,
              phone: r.phone,
              email: r.email,
              relationship: r.relationship,
              yearsOfRelationship: r.yearsOfRelationship,
              jointObligorId: newId,
            },
          });
        }
      }

      // Aval references
      for (const { sourceId, newId } of avalIdMap) {
        const sel = selection.avals.find((s) => s.sourceId === sourceId)!;
        if (!sel.references) continue;
        const src = selectedAvals.find((x) => x.id === sourceId)!;
        for (const r of src.personalReferences) {
          await tx.personalReference.create({
            data: {
              firstName: r.firstName,
              middleName: r.middleName,
              paternalLastName: r.paternalLastName,
              maternalLastName: r.maternalLastName,
              phone: r.phone,
              homePhone: r.homePhone,
              cellPhone: r.cellPhone,
              email: r.email,
              relationship: r.relationship,
              occupation: r.occupation,
              address: r.address,
              avalId: newId,
            },
          });
        }
        for (const r of src.commercialReferences) {
          await tx.commercialReference.create({
            data: {
              companyName: r.companyName,
              contactFirstName: r.contactFirstName,
              contactMiddleName: r.contactMiddleName,
              contactPaternalLastName: r.contactPaternalLastName,
              contactMaternalLastName: r.contactMaternalLastName,
              phone: r.phone,
              email: r.email,
              relationship: r.relationship,
              yearsOfRelationship: r.yearsOfRelationship,
              avalId: newId,
            },
          });
        }
      }

      // ---- Archive prior investigations on the old policy ----
      await tx.actorInvestigation.updateMany({
        where: {
          policyId: source.id,
          status: { in: [ActorInvestigationStatus.PENDING, ActorInvestigationStatus.APPROVED] },
        },
        data: {
          status: ActorInvestigationStatus.ARCHIVED,
          archivedAt: new Date(),
          archiveReason: InvestigationArchiveReason.SUPERSEDED,
          archiveComment: `Replaced by renewal ${policyNumber}`,
          brokerToken: null,
          landlordToken: null,
        },
      });

      // ---- Create fresh PENDING investigations on new policy ----
      const newTenant = newPolicy.tenant;
      if (newTenant) {
        await tx.actorInvestigation.create({
          data: {
            policyId: newPolicy.id,
            actorType: 'TENANT',
            actorId: newTenant.id,
            submittedBy: initiatedById,
            status: ActorInvestigationStatus.PENDING,
          },
        });
      }
      for (const { newId } of joIdMap) {
        await tx.actorInvestigation.create({
          data: {
            policyId: newPolicy.id,
            actorType: 'JOINT_OBLIGOR',
            actorId: newId,
            submittedBy: initiatedById,
            status: ActorInvestigationStatus.PENDING,
          },
        });
      }
      for (const { newId } of avalIdMap) {
        await tx.actorInvestigation.create({
          data: {
            policyId: newPolicy.id,
            actorType: 'AVAL',
            actorId: newId,
            submittedBy: initiatedById,
            status: ActorInvestigationStatus.PENDING,
          },
        });
      }

      // ---- Link OLD → NEW ----
      await tx.policy.update({
        where: { id: source.id },
        data: { renewedToId: newPolicy.id },
      });

      return {
        newPolicy,
        joIdMap,
        avalIdMap,
      };
    },
    { maxWait: 10000, timeout: 60000 },
  );

  const { newPolicy, joIdMap, avalIdMap } = txResult;

  // ============================================================
  // 2. POST-COMMIT WORK — S3 copies, tokens, activity log
  // ============================================================
  let documentsCopied = 0;
  let documentsFailed = 0;

  const copyDocsFor = async (args: {
    actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
    newActorId: string;
    sourceDocs: Array<{
      category: any;
      documentType: string;
      fileName: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      s3Key: string;
      s3Bucket: string;
      s3Region: string | null;
    }>;
  }) => {
    const storage = getStorageProvider();
    for (const doc of args.sourceDocs) {
      try {
        const newKey = documentService.generateActorS3Key(
          newPolicy.policyNumber,
          args.actorType,
          args.newActorId,
          doc.originalName,
        );
        await storage.copyObject(doc.s3Key, newKey, true);
        await prisma.actorDocument.create({
          data: {
            category: doc.category,
            documentType: doc.documentType,
            fileName: doc.fileName,
            originalName: doc.originalName,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            s3Key: newKey,
            s3Bucket: doc.s3Bucket,
            s3Region: doc.s3Region,
            uploadStatus: DocumentUploadStatus.COMPLETE,
            uploadedAt: new Date(),
            uploadedBy: initiatedById,
            ...(args.actorType === 'landlord' && { landlordId: args.newActorId }),
            ...(args.actorType === 'tenant' && { tenantId: args.newActorId }),
            ...(args.actorType === 'jointObligor' && { jointObligorId: args.newActorId }),
            ...(args.actorType === 'aval' && { avalId: args.newActorId }),
          },
        });
        documentsCopied++;
      } catch (err) {
        console.error('[RENEWAL] Document copy failed', {
          sourceKey: doc.s3Key,
          actorType: args.actorType,
          error: err instanceof Error ? err.message : err,
        });
        documentsFailed++;
      }
    }
  };

  // Landlord docs
  if (selection.landlord.include && selection.landlord.documents) {
    const newLandlord = newPolicy.landlords[0];
    await copyDocsFor({
      actorType: 'landlord',
      newActorId: newLandlord.id,
      sourceDocs: sourceLandlord.documents,
    });
  }

  // Tenant docs
  if (source.tenant && newPolicy.tenant && selection.tenant.include && selection.tenant.documents) {
    await copyDocsFor({
      actorType: 'tenant',
      newActorId: newPolicy.tenant.id,
      sourceDocs: source.tenant.documents,
    });
  }

  // JO docs
  for (const { sourceId, newId } of joIdMap) {
    const sel = selection.jointObligors.find((s) => s.sourceId === sourceId)!;
    if (!sel.documents) continue;
    const src = selectedJOs.find((x) => x.id === sourceId)!;
    await copyDocsFor({
      actorType: 'jointObligor',
      newActorId: newId,
      sourceDocs: src.documents,
    });
  }

  // Aval docs
  for (const { sourceId, newId } of avalIdMap) {
    const sel = selection.avals.find((s) => s.sourceId === sourceId)!;
    if (!sel.documents) continue;
    const src = selectedAvals.find((x) => x.id === sourceId)!;
    await copyDocsFor({
      actorType: 'aval',
      newActorId: newId,
      sourceDocs: src.documents,
    });
  }

  // ---- Generate tokens for all new actors ----
  try {
    await generatePolicyActorTokens(newPolicy.id);
  } catch (err) {
    console.error('[RENEWAL] Token generation failed', err);
  }

  // ---- Activity logs ----
  await Promise.all([
    logPolicyActivity({
      policyId: newPolicy.id,
      action: 'created',
      description: `Policy created from renewal of #${source.policyNumber}`,
      details: {
        renewedFromId: source.id,
        renewedFromNumber: source.policyNumber,
        initiatedById,
        documentsCopied,
        documentsFailed,
      },
      performedById: initiatedById,
      performedByType: 'user',
    }),
    logPolicyActivity({
      policyId: source.id,
      action: 'renewed',
      description: `Policy renewed into #${newPolicy.policyNumber}`,
      details: {
        renewedToId: newPolicy.id,
        renewedToNumber: newPolicy.policyNumber,
        initiatedById,
      },
      performedById: initiatedById,
      performedByType: 'user',
    }),
  ]);

  return {
    newPolicyId: newPolicy.id,
    newPolicyNumber: newPolicy.policyNumber,
    documentsCopied,
    documentsFailed,
  };
}
