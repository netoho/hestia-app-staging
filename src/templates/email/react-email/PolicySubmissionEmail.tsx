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
import { PolicySubmissionData } from '@/lib/services/emailService';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';
import { formatDateTimeLong } from '@/lib/utils/formatting';

interface PolicySubmissionEmailProps extends PolicySubmissionData {}

export const PolicySubmissionEmail: React.FC<PolicySubmissionEmailProps> = ({
  tenantEmail,
  tenantName,
  policyId,
  submittedAt,
}) => {
  const submittedDate = formatDateTimeLong(submittedAt);

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
            background: `linear-gradient(135deg, ${brandColors.success} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
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
              Solicitud Recibida
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Tu aplicación está en proceso
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
              ¡Gracias{tenantName ? `, ${tenantName}` : ''}!
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Hemos recibido exitosamente tu solicitud de protección de arrendamiento.
            </Text>

            {/* Success Box */}
            <Section style={{
              backgroundColor: '#f0fff4',
              border: '2px solid #9ae6b4',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.success
              }}>
                Detalles de tu Solicitud
              </Heading>
              <Text style={{ margin: '0 0 10px 0', color: brandColors.textPrimary }}>
                <strong>ID de Solicitud:</strong> #{policyId}
              </Text>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                <strong>Enviada el:</strong> {submittedDate}
              </Text>
            </Section>

            <Heading style={{
              color: brandColors.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              ¿Qué sigue ahora?
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              <strong>1. Revisión de documentos:</strong> Nuestro equipo revisará tu solicitud y documentos
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              <strong>2. Verificación de referencias:</strong> Podemos contactar a tus referencias para verificación
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              <strong>3. Decisión final:</strong> Recibirás un correo con nuestra decisión en 2-3 días hábiles
            </Text>

            {/* Info Box */}
            <Section style={{
              backgroundColor: '#ebf8ff',
              border: '2px solid #bee3f8',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                📧 Si necesitamos información adicional, te contactaremos a esta dirección de correo electrónico.
              </Text>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              marginTop: '30px'
            }}>
              Apreciamos tu confianza en Hestia para proteger tu tranquilidad en el arrendamiento.
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
                  <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
                    <table style={{ margin: '0 auto' }}>
                      <tr>
                        <td style={{ padding: '0 15px' }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📧 {brandInfo.supportEmail}
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
                      Todos los derechos reservados | <a href={`${process.env.NEXT_PUBLIC_APP_URL}/privacy`} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Aviso de Privacidad</a> | <a href={`${process.env.NEXT_PUBLIC_APP_URL}/terms`} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Términos y Condiciones</a>
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

export default PolicySubmissionEmail;
