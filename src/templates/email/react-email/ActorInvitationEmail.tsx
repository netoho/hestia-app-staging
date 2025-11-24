import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
} from '@react-email/components';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

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
    return documents.map((doc, index) => (
        <Text key={index} style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: brandColors.textPrimary,
            margin: '8px 0'
        }}>
            • {doc}
        </Text>
    ));
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

  const actorTypeName = actorTypeNames[actorType];

  const expiryDateFormatted = expiryDate
    ? new Date(expiryDate).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'en 7 días';

  const privacyUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.privacy}`;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.terms}`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: brandColors.background, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Container style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '20px'
        }}>
          {/* Header */}
          <Section style={{
            background: `linear-gradient(135deg, ${brandColors.email.headerGradientStart} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
            padding: '30px',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
          }}>
            <img
                src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
                alt={brandInfo.name}
                width="150"
                style={{ margin: '0 auto' }}
            />
            <Heading style={{
              margin: 0,
              color: brandColors.textPrimary,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Completa tu Información
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              {actorTypeName} - Protección #{policyNumber}
            </Text>
          </Section>

          {/* Content */}
          <Section style={{
            backgroundColor: brandColors.white,
            padding: '40px 30px',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <Heading style={{
              color: brandColors.textPrimary,
              marginTop: 0,
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Hola{name ? ` ${name}` : ''},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              <strong>{initiatorName || 'El administrador'}</strong> te ha designado como <strong>{actorTypeName}</strong> en una protección de arrendamiento.
            </Text>

            {/* Info Box */}
            <Section style={{
              backgroundColor: brandColors.email.infoBackground,
              border: `2px solid ${brandColors.email.infoBorder}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{ margin: '0 0 10px 0', color: brandColors.textPrimary }}>
                <strong>No. Protección:</strong> {policyNumber}
              </Text>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                <strong>Propiedad:</strong> {propertyAddress}
              </Text>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Para continuar con el proceso, necesitamos que completes tu información y documentación:
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={url}
                style={{
                  backgroundColor: brandColors.accent,
                  color: brandColors.white,
                  padding: '16px 32px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                  display: 'inline-block'
                }}
              >
                ✨ Completar Mi Información
              </Button>
            </Section>

            <Heading style={{
              color: brandColors.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              ¿Qué necesitarás?
            </Heading>

            <PolicyDocumentation actorType={actorType} isCompany={isCompany}/>

            {/* Warning Box */}
            <Section style={{
              backgroundColor: brandColors.email.warningBackground,
              border: `2px solid ${brandColors.email.warningBorder}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.warning
              }}>
                ⚠️ Importante
              </Heading>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                Este enlace expirará el <strong>{expiryDateFormatted}</strong>.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: `2px solid ${brandColors.border}`,
          }}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
                    <img
                      src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
                      alt={brandInfo.name}
                      width="150"
                      style={{ margin: '0 auto', display: 'block', }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingBottom: '15px' }}>
                    <Text style={{
                      margin: '0',
                      fontSize: '14px',
                      color: brandColors.textMuted,
                      fontStyle: 'italic'
                    }}>
                      {brandInfo.tagline}
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
                    <table style={{ margin: '0 auto' }}>
                      <tr>
                        <td style={{ padding: '0 15px' }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📧 {brandInfo.infoEmail}
                          </Text>
                        </td>
                        <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📱 {brandInfo.supportPhone}
                          </Text>
                        </td>
                        <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📍 {brandInfo.location}
                          </Text>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingTop: '15px', borderTop: `1px solid ${brandColors.border}` }}>
                    <Text style={{
                      margin: '10px 0 0 0',
                      fontSize: '12px',
                      color: brandColors.textMuted
                    }}>
                      © {new Date().getFullYear()} {brandInfo.companyLegalName}
                    </Text>
                    <Text style={{
                      margin: '5px 0 0 0',
                      fontSize: '11px',
                      color: brandColors.textMuted
                    }}>
                      Todos los derechos reservados | <a href={privacyUrl} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Aviso de Privacidad</a> | <a href={termsUrl} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Términos y Condiciones</a>
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ActorInvitationEmail;
