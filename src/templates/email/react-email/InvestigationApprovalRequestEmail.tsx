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
import { formatDateLong } from '@/lib/utils/formatting';

export interface InvestigationApprovalRequestEmailProps {
  email: string;
  recipientName?: string;
  recipientType: 'BROKER' | 'LANDLORD';
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  approvalUrl: string;
  expiryDate: Date;
}

const actorTypeNames: Record<string, string> = {
  'TENANT': 'Inquilino',
  'JOINT_OBLIGOR': 'Obligado Solidario',
  'AVAL': 'Aval'
};

export const InvestigationApprovalRequestEmail: React.FC<InvestigationApprovalRequestEmailProps> = ({
  email,
  recipientName,
  recipientType,
  policyNumber,
  propertyAddress,
  actorType,
  actorName,
  approvalUrl,
  expiryDate,
}) => {
  const privacyUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.privacy}`;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.terms}`;
  const expiryDateFormatted = formatDateLong(expiryDate);

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
              Aprobación de Investigación
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Protección #{policyNumber}
            </Text>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              {propertyAddress}
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
              Hola{recipientName ? ` ${recipientName}` : ''},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Se ha completado la investigación de <strong>{actorName}</strong> ({actorTypeNames[actorType]}) y requiere tu aprobación.
            </Text>

            {/* Investigation Result Box */}
            <Section style={{
              backgroundColor: brandColors.email.infoBackground,
              border: `2px solid ${brandColors.email.infoBorder}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{ margin: '0 0 10px 0', color: brandColors.textPrimary }}>
                <strong>Actor:</strong> {actorName}
              </Text>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                <strong>Tipo:</strong> {actorTypeNames[actorType]}
              </Text>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Por favor revisa la investigación y decide si aprobar o rechazar.
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={approvalUrl}
                style={{
                  backgroundColor: brandColors.accent,
                  color: brandColors.white,
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-block',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                Revisar y Aprobar
              </Button>
            </Section>

            {/* Expiry Notice */}
            <Section style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              padding: '15px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{
                fontSize: '14px',
                color: '#92400e',
                margin: 0,
                textAlign: 'center'
              }}>
                Este enlace expira el <strong>{expiryDateFormatted}</strong>
              </Text>
            </Section>

            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              margin: '16px 0'
            }}>
              Si tienes alguna duda, contacta a nuestro equipo de soporte.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center', padding: '20px 0' }}>
            <img
              src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
              alt={brandInfo.name}
              width="100"
              style={{ margin: '0 auto 10px auto', opacity: 0.7 }}
            />
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '14px',
              margin: '8px 0'
            }}>
              {brandInfo.name} - {brandInfo.tagline}
            </Text>
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '12px',
              margin: '8px 0'
            }}>
              <a href={privacyUrl} style={{ color: brandColors.accent }}>Aviso de Privacidad</a>
              {' | '}
              <a href={termsUrl} style={{ color: brandColors.accent }}>Términos y Condiciones</a>
            </Text>
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '12px',
              margin: '4px 0'
            }}>
              {brandInfo.address}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InvestigationApprovalRequestEmail;
