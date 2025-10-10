import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logPolicyActivity } from '@/lib/services/policyService';
import { validateLandlordToken } from '@/lib/services/actorTokenService';

// Validation schemas
const addressSchema = z.object({
  street: z.string().min(1, 'La calle es requerida'),
  exteriorNumber: z.string().min(1, 'El número exterior es requerido'),
  interiorNumber: z.string().optional(),
  neighborhood: z.string().min(1, 'La colonia es requerida'),
  postalCode: z.string().min(4, 'El código postal es requerido'),
  municipality: z.string().min(1, 'El municipio es requerido'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El estado es requerido'),
  country: z.string().default('México'),
  placeId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  formattedAddress: z.string().optional(),
});

const individualLandlordSchema = z.object({
  isCompany: z.literal(false),
  fullName: z.string().min(1, 'El nombre completo es requerido'),
  rfc: z.string().min(12).max(13).optional().nullable().or(z.literal('')),
  curp: z.string().length(18).optional().nullable().or(z.literal('')),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  workPhone: z.string().optional().nullable().or(z.literal('')),
  personalEmail: z.string().email().optional().nullable().or(z.literal('')),
  workEmail: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),
  occupation: z.string().optional().nullable().or(z.literal('')),
  employerName: z.string().optional().nullable().or(z.literal('')),
  monthlyIncome: z.number().positive().optional().nullable(),
  // Bank info
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable().or(z.literal('')),
  accountHolder: z.string().optional().nullable().or(z.literal('')),
  // Property info
  propertyDeedNumber: z.string().optional().nullable().or(z.literal('')),
  propertyRegistryFolio: z.string().optional().nullable().or(z.literal('')),
  requiresCFDI: z.boolean().default(false),
  cfdiData: z.string().optional().nullable().or(z.literal('')),
  additionalInfo: z.string().optional().nullable().or(z.literal('')),
});

const companyLandlordSchema = z.object({
  isCompany: z.literal(true),
  companyName: z.string().min(1, 'El nombre de la empresa es requerido'),
  companyRfc: z.string().min(12).max(13, 'RFC debe tener 12 o 13 caracteres'),
  legalRepName: z.string().min(1, 'El nombre del representante legal es requerido'),
  legalRepPosition: z.string().min(1, 'El cargo del representante es requerido'),
  legalRepRfc: z.string().min(12).max(13).optional().nullable().or(z.literal('')),
  legalRepPhone: z.string().min(10),
  legalRepEmail: z.string().email(),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  workPhone: z.string().optional().nullable().or(z.literal('')),
  workEmail: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),
  // Bank info
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable().or(z.literal('')),
  accountHolder: z.string().optional().nullable().or(z.literal('')),
  // Property info
  propertyDeedNumber: z.string().optional().nullable().or(z.literal('')),
  propertyRegistryFolio: z.string().optional().nullable().or(z.literal('')),
  requiresCFDI: z.boolean().default(false),
  cfdiData: z.string().optional().nullable().or(z.literal('')),
  additionalInfo: z.string().optional().nullable().or(z.literal('')),
});

// Property details schema
const propertyDetailsSchema = z.object({
  parkingSpaces: z.number().int().min(0).optional().nullable(),
  parkingNumbers: z.string().optional().nullable().or(z.literal('')), // JSON array
  isFurnished: z.boolean().default(false),
  hasPhone: z.boolean().default(false),
  hasElectricity: z.boolean().default(true),
  hasWater: z.boolean().default(true),
  hasGas: z.boolean().default(false),
  hasCableTV: z.boolean().default(false),
  hasInternet: z.boolean().default(false),
  otherServices: z.string().optional().nullable().or(z.literal('')), // JSON array
  utilitiesInLandlordName: z.boolean().default(false),
  hasIVA: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
  securityDeposit: z.number().min(0).optional().nullable(),
  maintenanceFee: z.number().min(0).optional().nullable(),
  maintenanceIncludedInRent: z.boolean().default(false),
  rentIncreasePercentage: z.number().min(0).max(100).optional().nullable(),
  paymentMethod: z.string().optional().nullable().or(z.literal('')),
  hasInventory: z.boolean().default(false),
  hasRules: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  propertyDeliveryDate: z.string().optional().nullable().or(z.literal('')),
  contractSigningDate: z.string().optional().nullable().or(z.literal('')),
  contractSigningLocation: z.string().optional().nullable().or(z.literal('')),
  propertyAddressDetails: addressSchema.optional().nullable(),
});

const requestSchema = z.object({
  landlord: z.discriminatedUnion('isCompany', [
    individualLandlordSchema,
    companyLandlordSchema,
  ]),
  propertyDetails: propertyDetailsSchema.optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token
    const validation = await validateLandlordToken(token);
    if (!validation.valid || !validation.landlord) {
      return NextResponse.json(
        { error: validation.message || 'Token inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validatedData = requestSchema.parse(body);
    const { landlord: landlordData, propertyDetails } = validatedData;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create address if provided
      let addressId = validation.landlord.addressId;
      if (landlordData.addressDetails) {
        const address = await tx.propertyAddress.upsert({
          where: { id: addressId || '' },
          create: landlordData.addressDetails,
          update: landlordData.addressDetails,
        });
        addressId = address.id;
      }

      // Update landlord information
      const updatedLandlord = await tx.landlord.update({
        where: { id: validation.landlord.id },
        data: {
          isCompany: landlordData.isCompany,
          // Individual fields
          fullName: !landlordData.isCompany ? landlordData.fullName : null,
          rfc: !landlordData.isCompany ? landlordData.rfc : null,
          curp: !landlordData.isCompany ? landlordData.curp : null,
          // Company fields
          companyName: landlordData.isCompany ? landlordData.companyName : null,
          companyRfc: landlordData.isCompany ? landlordData.companyRfc : null,
          legalRepName: landlordData.isCompany ? landlordData.legalRepName : null,
          legalRepPosition: landlordData.isCompany ? landlordData.legalRepPosition : null,
          legalRepRfc: landlordData.isCompany ? landlordData.legalRepRfc : null,
          legalRepPhone: landlordData.isCompany ? landlordData.legalRepPhone : null,
          legalRepEmail: landlordData.isCompany ? landlordData.legalRepEmail : null,
          // Common fields
          email: landlordData.email,
          phone: landlordData.phone,
          workPhone: landlordData.workPhone,
          personalEmail: !landlordData.isCompany ? landlordData.personalEmail : null,
          workEmail: landlordData.workEmail,
          address: landlordData.address,
          addressId,
          // Work info (for individuals)
          occupation: !landlordData.isCompany ? landlordData.occupation : null,
          employerName: !landlordData.isCompany ? landlordData.employerName : null,
          monthlyIncome: !landlordData.isCompany ? landlordData.monthlyIncome : null,
          // Bank info
          bankName: landlordData.bankName,
          accountNumber: landlordData.accountNumber,
          clabe: landlordData.clabe,
          accountHolder: landlordData.accountHolder,
          // Property management
          propertyDeedNumber: landlordData.propertyDeedNumber,
          propertyRegistryFolio: landlordData.propertyRegistryFolio,
          requiresCFDI: landlordData.requiresCFDI,
          cfdiData: landlordData.cfdiData,
          additionalInfo: landlordData.additionalInfo,
          informationComplete: true,
          completedAt: new Date(),
        },
      });

      // Update property details if provided
      if (propertyDetails) {
        let propertyAddressId = validation.landlord.policy.propertyAddressId;

        // Create/update property address if provided
        if (propertyDetails.propertyAddressDetails) {
          const propertyAddress = await tx.propertyAddress.upsert({
            where: { id: propertyAddressId || '' },
            create: propertyDetails.propertyAddressDetails,
            update: propertyDetails.propertyAddressDetails,
          });
          propertyAddressId = propertyAddress.id;
        }

        await tx.policy.update({
          where: { id: validation.landlord.policyId },
          data: {
            propertyAddressId,
            parkingSpaces: propertyDetails.parkingSpaces,
            parkingNumbers: propertyDetails.parkingNumbers,
            isFurnished: propertyDetails.isFurnished,
            hasPhone: propertyDetails.hasPhone,
            hasElectricity: propertyDetails.hasElectricity,
            hasWater: propertyDetails.hasWater,
            hasGas: propertyDetails.hasGas,
            hasCableTV: propertyDetails.hasCableTV,
            hasInternet: propertyDetails.hasInternet,
            otherServices: propertyDetails.otherServices,
            utilitiesInLandlordName: propertyDetails.utilitiesInLandlordName,
            hasIVA: propertyDetails.hasIVA,
            issuesTaxReceipts: propertyDetails.issuesTaxReceipts,
            securityDeposit: propertyDetails.securityDeposit,
            maintenanceFee: propertyDetails.maintenanceFee,
            maintenanceIncludedInRent: propertyDetails.maintenanceIncludedInRent,
            rentIncreasePercentage: propertyDetails.rentIncreasePercentage,
            paymentMethod: propertyDetails.paymentMethod,
            hasInventory: propertyDetails.hasInventory,
            hasRules: propertyDetails.hasRules,
            petsAllowed: propertyDetails.petsAllowed,
            propertyDeliveryDate: propertyDetails.propertyDeliveryDate ? new Date(propertyDetails.propertyDeliveryDate) : null,
            contractSigningDate: propertyDetails.contractSigningDate ? new Date(propertyDetails.contractSigningDate) : null,
            contractSigningLocation: propertyDetails.contractSigningLocation,
          },
        });
      }

      // Log activity
      await logPolicyActivity({
        policyId: validation.landlord.policyId,
        action: 'landlord_info_completed',
        description: 'El arrendador completó su información',
        performedByActor: 'landlord',
        details: {
          landlordId: updatedLandlord.id,
          isCompany: updatedLandlord.isCompany,
        },
      });

      return updatedLandlord;
    });

    return NextResponse.json({
      success: true,
      message: 'Información actualizada correctamente',
      landlord: {
        id: result.id,
        informationComplete: result.informationComplete,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        },
        { status: 400 }
      );
    }

    console.error('Landlord submission error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la información' },
      { status: 500 }
    );
  }
}