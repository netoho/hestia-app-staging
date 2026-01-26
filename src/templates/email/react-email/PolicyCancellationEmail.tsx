import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
} from '@react-email/components';
import { PolicyCancellationEmailData } from '@/lib/services/emailService';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';
import { formatDateTimeLong } from '@/lib/utils/formatting';

interface PolicyCancellationEmailProps extends PolicyCancellationEmailData {}

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  CLIENT_REQUEST: 'Solicitud del Cliente',
  NON_PAYMENT: 'Falta de Pago',
  FRAUD: 'Fraude',
  DOCUMENTATION_ISSUES: 'Problemas de Documentación',
  LANDLORD_REQUEST: 'Solicitud del Arrendador',
  TENANT_REQUEST: 'Solicitud del Inquilino',
  OTHER: 'Otro',
};

export const PolicyCancellationEmail: React.FC<PolicyCancellationEmailProps> = ({
  adminName,
  policyNumber,
  cancellationReason,
  cancellationComment,
  cancelledByName,
  cancelledAt,
  policyLink,
}) => {
  const reasonLabel = CANCELLATION_REASON_LABELS[cancellationReason] || cancellationReason;
  const cancelledDate = formatDateTimeLong(cancelledAt);

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
            background: `linear-gradient(135deg, ${brandColors.danger} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
            padding: '30px',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
          }}>
            <img
              src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
              alt={brandInfo.name}
              width="150"
              height="50"
              style={{ margin: '0 auto' }}
            />
            <Heading style={{
              margin: 0,
              color: brandColors.textPrimary,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Protección Cancelada
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Notificación de cancelación
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
              Hola{adminName ? ` ${adminName}` : ''},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Se ha cancelado una protección en el sistema. A continuacion los detalles:
            </Text>

            {/* Cancellation Details Box */}
            <Section style={{
              backgroundColor: '#fed7d7',
              border: '2px solid #feb2b2',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 15px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.danger
              }}>
                Detalles de la Cancelación
              </Heading>
              <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                <strong>Número de Protección:</strong> {policyNumber}
              </Text>
              <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                <strong>Razón:</strong> {reasonLabel}
              </Text>
              <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                <strong>Comentario:</strong> {cancellationComment}
              </Text>
              <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                <strong>Cancelada por:</strong> {cancelledByName}
              </Text>
              <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                <strong>Fecha:</strong> {cancelledDate}
              </Text>
            </Section>

            {policyLink && (
              <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                <a
                  href={policyLink}
                  style={{
                    backgroundColor: brandColors.secondary,
                    color: brandColors.white,
                    padding: '14px 28px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '16px',
                    display: 'inline-block',
                  }}
                >
                  Ver Protección
                </a>
              </Section>
            )}

            <Hr style={{ margin: '40px 0 20px 0', borderColor: '#f7fafc' }} />

            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              marginTop: '20px'
            }}>
              Este es un mensaje automático del sistema. Si tienes preguntas sobre esta cancelación, contacta al equipo que la realizo.
            </Text>
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
                    <Img
                      src={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/logo-hestia-azul-top.png`}
                      alt="Hestia Logo"
                      width="140"
                      height="40"
                      style={{ margin: '0 auto', display: 'block' }}
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
                  <td style={{ textAlign: 'center', paddingTop: '15px', borderTop: `1px solid ${brandColors.border}` }}>
                    <Text style={{
                      margin: '10px 0 0 0',
                      fontSize: '12px',
                      color: brandColors.textMuted
                    }}>
                      © {new Date().getFullYear()} {brandInfo.companyLegalName}
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

export default PolicyCancellationEmail;
