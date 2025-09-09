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
  Hr,
  Img,
} from '@react-email/components';
import { PolicyInvitationData } from '@/lib/services/emailService';
import { generatePolicyUrl } from '@/lib/utils/tokenUtils';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

export const PolicyInvitationEmail: React.FC<PolicyInvitationEmailProps> = ({
  tenantEmail,
  tenantName,
  propertyAddress,
  accessToken,
  expiryDate,
  initiatorName,
}) => {
  const policyUrl = generatePolicyUrl(accessToken, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/logo-hestia-blanco.png`}
              alt="Hestia Logo"
              width="180"
              height="51"
              style={{
                margin: '0 auto 20px',
                display: 'block'
              }}
            />
            <Heading style={{
              margin: 0,
              color: brandColors.white,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Solicitud de Póliza de Garantía
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Completa tu aplicación en minutos
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
              Hola{tenantName ? ` ${tenantName}` : ''},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              <strong>{initiatorName}</strong> ha iniciado una solicitud de póliza de garantía para ti
              {propertyAddress && (
                <> para la propiedad ubicada en <strong>{propertyAddress}</strong></>
              )}.
            </Text>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Para completar tu solicitud, haz clic en el botón de abajo y sigue el proceso paso a paso:
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={policyUrl}
                style={{
                  backgroundColor: brandColors.primary,
                  color: brandColors.white,
                  padding: '16px 32px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 6px ${brandColors.email.buttonShadow}`,
                  display: 'inline-block'
                }}
              >
                ✨ Completar Mi Solicitud
              </Button>
            </Section>

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
                Por favor completa tu solicitud antes de esta fecha.
              </Text>
            </Section>

            <Heading style={{
              color: brandColors.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              Lo que necesitarás:
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Identificación válida (CURP mexicana o pasaporte)
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Información laboral y comprobantes de ingresos
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Información de contacto de referencias personales
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Documentos adicionales (opcional)
            </Text>

            {/* Info Box */}
            <Section style={{
              backgroundColor: brandColors.email.infoBackground,
              border: `2px solid ${brandColors.email.infoBorder}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                💡 <strong>Tip:</strong> El proceso de solicitud toma típicamente 15-20 minutos en completarse.
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
                    Todos los derechos reservados | <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy" style={{ color: brandColors.secondary, textDecoration: 'none' }}>Aviso de Privacidad</a> | <a href="${process.env.NEXT_PUBLIC_APP_URL}/terms" style={{ color: brandColors.secondary, textDecoration: 'none' }}>Términos y Condiciones</a>
                  </Text>
                </td>
              </tr>
            </table>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PolicyInvitationEmail;