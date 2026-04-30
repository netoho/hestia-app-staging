import React from 'react';
import { Section, Text, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailInfoBox,
  EmailWarningBox,
  EmailParagraph,
} from '../components';
import { brandColors } from '@/lib/config/brand';
import { formatAddress } from "@/lib/schemas/shared/address.schema";
import { formatDateLong } from '@/lib/utils/formatting';

export interface ActorInvitationEmailProps {
  actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
  isCompany: boolean;
  email: string;
  name?: string;
  token: string;
  url: string;
  policyNumber: string;
  propertyAddress: string;
  expiryDate?: Date;
  initiatorName?: string;
}

const documentationList = (actorType: string, isCompany: boolean): string[] => {
  if (actorType === 'landlord'){
    if(isCompany){
      return [
        'Escritura constitutiva de la empresa',
        'Escritura en la que consten las facultades del representante legal',
        'Identificación oficial del representante (INE o pasaporte)',
        'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
        'Constancia de situación fiscal de la sociedad (CSD)',
        'Constancia de situación fiscal del representante legal (CSD)',
        'Comprobante de domicilio de la sociedad (no mayor a 3 meses)',
        'Escritura o documento con que se acredite la propiedad del inmueble',
      ]
    }

    return [
      'Identificación oficial (INE o pasaporte)',
      'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
      'Constancia de situación fiscal (CSD)',
      'Comprobante de domicilio particular actual (no mayor a 3 meses)',
      'Escritura o documento con que se acredite la propiedad del inmueble',
    ]
  }

  if (actorType === 'tenant'){
    if(isCompany){
      return [
        'Escritura constitutiva de la empresa',
        'Escritura en la que consten las facultades del representante legal',
        'Identificación oficial del representante (INE o pasaporte)',
        'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
        'Constancia de situación fiscal de la sociedad (CSD)',
        'Constancia de situación fiscal del representante legal (CSD)',
        'Documentos que acrediten ingresos (3 últimos meses), No Tarjeta de crédito ni inversiones',
        'Reporte de crédito especial para Personas Morales (no mayor a una semana)',
      ]
    }

    return [
      'Identificación oficial (INE o pasaporte)',
      'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
      'Constancia de situación fiscal (CSD)',
      'Documentos que acrediten ingresos (3 últimos meses), No Tarjeta de crédito ni inversiones',
      'Reporte de crédito especial (no mayor a una semana)',
    ]
  }

  if (actorType === 'jointObligor'){
    if(isCompany){
      return [
        'Escritura constitutiva de la empresa',
        'Escritura en la que consten las facultades del representante legal',
        'Identificación oficial del representante (INE o pasaporte)',
        'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
        'Constancia de situación fiscal de la sociedad (CSD)',
        'Constancia de situación fiscal del representante legal (CSD)',
        'Comprobante de domicilio de la sociedad (no mayor a 3 meses)',
        'Documentos que acrediten ingresos (3 últimos meses), No Tarjeta de crédito ni inversiones',
        'Reporte de crédito especial para Personas Morales (no mayor a una semana)',
      ]
    }

    return [
      'Identificación oficial (INE o pasaporte)',
      'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
      'Constancia de situación fiscal (CSD)',
      'Comprobante de domicilio particular actual (no mayor a 3 meses)',
      'Documentos que acrediten ingresos (3 últimos meses), No Tarjeta de crédito ni inversiones',
      'Reporte de crédito especial (no mayor a una semana)',
    ]
  }

  if (actorType === 'aval'){
    if(isCompany){
      return [
        'Escritura completa del inmueble que se ofrece en garantía (libre de gravamen y en la misma entidad federativa)',
        'Boleta predial',
        'Escritura constitutiva de la empresa',
        'Escritura en la que consten las facultades del representante legal',
        'Identificación oficial del representante (INE o pasaporte)',
        'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
        'Constancia de situación fiscal de la sociedad (CSD)',
        'Constancia de situación fiscal del representante legal (CSD)',
        'Comprobante de domicilio de la sociedad (no mayor a 3 meses)',
        'Documentos que acrediten ingresos (3 últimos meses), No Tarjeta de crédito ni inversiones',
        'Reporte de crédito especial para Personas Morales (no mayor a una semana)',
      ]
    }

    return [
      'Escritura completa del inmueble que se ofrece en garantía (libre de gravamen y en la misma entidad federativa)',
      'Boleta predial',
      'Identificación oficial (INE o pasaporte)',
      'Pasaporte y Forma Migratoria (en caso de ser extranjero)',
      'Constancia de situación fiscal (CSD)',
      'Comprobante de domicilio particular actual (no mayor a 3 meses)',
      'En caso de estar casado bajo el régimen de sociedad conyugal, se requiere la identificación oficial del cónyuge',
      'Reporte de crédito especial (no mayor a una semana)',
    ]
  }

  return []
}

interface PolicyDocumentationProps {
    actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
    isCompany: boolean;
}

const PolicyDocumentation: React.FC<PolicyDocumentationProps> = ({ actorType, isCompany }) => {
    const documents = documentationList(actorType, isCompany);
    return (
      <>
        {documents.map((doc, index) => (
          <Text key={index} style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: brandColors.textPrimary,
            margin: '8px 0'
          }}>
            • {doc}
          </Text>
        ))}
      </>
    );
}

const formatAddressObject = (address: string | object): string => {
  if (typeof address === 'string') {
    return address;
  }
  // Assuming address is an object with street, city, state, zip properties

  return formatAddress(address);
}

export const ActorInvitationEmail: React.FC<ActorInvitationEmailProps> = ({
  actorType,
  isCompany,
  email,
  name,
  token,
  url,
  policyNumber,
  propertyAddress,
  expiryDate,
  initiatorName,
}) => {
  const actorTypeNames = {
    'landlord': 'Arrendador',
    'tenant': 'Inquilino',
    'jointObligor': 'Obligado Solidario',
    'aval': 'Aval'
  };

  const formattedAddress = formatAddressObject(propertyAddress);

  const actorTypeName = actorTypeNames[actorType];

  const expiryDateFormatted = expiryDate
    ? formatDateLong(expiryDate)
    : 'en 7 días';

  return (
    <EmailLayout>
      <EmailHeader
        title="Completa tu Información"
        subtitle={`${actorTypeName} - Protección #${policyNumber}`}
      />
      <EmailSection greeting={`Hola${name ? ` ${name}` : ''},`}>
        <EmailParagraph>
          <strong>{initiatorName || 'El administrador'}</strong> te ha designado como <strong>{actorTypeName}</strong> en una protección de arrendamiento.
        </EmailParagraph>

        <EmailInfoBox icon="📋">
          <strong>No. Protección:</strong> {policyNumber}
          <br />
          <strong>Propiedad:</strong> {formattedAddress}
        </EmailInfoBox>

        <EmailParagraph>
          Para continuar con el proceso, necesitamos que completes tu información y documentación:
        </EmailParagraph>

        <EmailButton href={url} variant="accent">
          ✨ Completar Mi Información
        </EmailButton>

        <Heading style={{
          color: brandColors.textPrimary,
          fontSize: '20px',
          fontWeight: 600,
          marginTop: '30px',
          marginBottom: '16px'
        }}>
          ¿Qué necesitarás?
        </Heading>

        <PolicyDocumentation actorType={actorType} isCompany={isCompany}/>

        <EmailWarningBox title="Importante" tone="warning">
          Este enlace expirará el <strong>{expiryDateFormatted}</strong>.
        </EmailWarningBox>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default ActorInvitationEmail;
