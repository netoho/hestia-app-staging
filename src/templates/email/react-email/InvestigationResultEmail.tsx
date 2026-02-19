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
import { formatDateTimeLong } from '@/lib/utils/formatting';

export interface InvestigationResultEmailProps {
  email: string;
  recipientName?: string;
  recipientType: 'ADMIN' | 'BROKER' | 'LANDLORD';
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  result: 'APPROVED' | 'REJECTED';
  approvedBy: string;
  approvedByType: 'BROKER' | 'LANDLORD';
  approvedAt: Date;
  notes?: string;
  rejectionReason?: string;
  policyUrl?: string;
}

const actorTypeNames: Record<string, string> = {
  'TENANT': 'Inquilino',
  'JOINT_OBLIGOR': 'Obligado Solidario',
  'AVAL': 'Aval'
};

const approverTypeNames: Record<string, string> = {
  'BROKER': 'el Broker',
  'LANDLORD': 'el Arrendador'
};

export const InvestigationResultEmail: React.FC<InvestigationResultEmailProps> = ({
  email,
  recipientName,
  recipientType,
  policyNumber,
  propertyAddress,
  actorType,
  actorName,
  result,
  approvedBy,
  approvedByType,
  approvedAt,
  notes,
  rejectionReason,
  policyUrl,
}) => {
  const privacyUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.privacy}`;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.terms}`;
  const isApproved = result === 'APPROVED';

  const resultColor = isApproved ? '#22c55e' : '#ef4444';
  const resultBgColor = isApproved ? '#dcfce7' : '#fee2e2';
  const resultBorderColor = isApproved ? '#86efac' : '#fca5a5';
  const resultText = isApproved ? 'Aprobada' : 'Rechazada';

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
              Investigación {resultText}
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Protección #{policyNumber}
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

            {/* Result Banner */}
            <Section style={{
              backgroundColor: resultBgColor,
              border: `2px solid ${resultBorderColor}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0',
              textAlign: 'center'
            }}>
              <Text style={{
                margin: 0,
                color: resultColor,
                fontSize: '20px',
                fontWeight: '700'
              }}>
                Investigación {resultText}
              </Text>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              La investigación de <strong>{actorName}</strong> ({actorTypeNames[actorType]}) ha sido <strong>{resultText.toLowerCase()}</strong> por {approverTypeNames[approvedByType]}.
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
                <strong>Actor:</strong> {actorName} ({actorTypeNames[actorType]})
              </Text>
              <Text style={{ margin: '0 0 10px 0', color: brandColors.textPrimary }}>
                <strong>Propiedad:</strong> {propertyAddress}
              </Text>
              <Text style={{ margin: '0 0 10px 0', color: brandColors.textPrimary }}>
                <strong>Decisión por:</strong> {approverTypeNames[approvedByType]}
              </Text>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                <strong>Fecha:</strong> {formatDateTimeLong(approvedAt)}
              </Text>
            </Section>

            {/* Notes/Reason */}
            {(notes || rejectionReason) && (
              <Section style={{
                backgroundColor: isApproved ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isApproved ? '#bbf7d0' : '#fecaca'}`,
                padding: '15px',
                borderRadius: '8px',
                margin: '20px 0'
              }}>
                <Text style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: brandColors.textPrimary,
                  margin: '0 0 8px 0'
                }}>
                  {isApproved ? 'Notas:' : 'Motivo del rechazo:'}
                </Text>
                <Text style={{
                  fontSize: '14px',
                  color: brandColors.textPrimary,
                  margin: 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {isApproved ? notes : rejectionReason}
                </Text>
              </Section>
            )}

            {policyUrl && (
              <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                <Button
                  href={policyUrl}
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
                  Ver Protección
                </Button>
              </Section>
            )}
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

export default InvestigationResultEmail;
