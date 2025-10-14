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
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

export interface ActorRejectionEmailProps {
  to: string;
  actorName: string;
  actorType: string;
  rejectionReason: string;
  policyNumber: string;
}

export const ActorRejectionEmail: React.FC<ActorRejectionEmailProps> = ({
  to,
  actorName,
  actorType,
  rejectionReason,
  policyNumber,
}) => {
  const actorTypeLabels: Record<string, string> = {
    landlord: 'Arrendador',
    tenant: 'Inquilino',
    jointObligor: 'Obligado Solidario',
    aval: 'Aval',
  };

  const actorTypeLabel = actorTypeLabels[actorType] || actorType;

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
            background: `linear-gradient(135deg, ${brandColors.danger} 0%, ${brandColors.warning} 100%)`,
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
              Información Rechazada
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Póliza #{policyNumber}
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
              Hola {actorName},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Tu información como <strong>{actorTypeLabel}</strong> para la póliza <strong>{policyNumber}</strong> ha sido rechazada.
            </Text>

            {/* Rejection Reason Box */}
            <Section style={{
              backgroundColor: '#fee2e2',
              border: '2px solid #fecaca',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.danger
              }}>
                Razón del rechazo:
              </Heading>
              <Text style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.5' }}>
                {rejectionReason}
              </Text>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Por favor, revisa y actualiza tu información según las observaciones proporcionadas. Puedes acceder nuevamente usando el enlace que te fue enviado anteriormente.
            </Text>

            {/* Info Box */}
            <Section style={{
              backgroundColor: brandColors.email.infoBackground,
              border: `2px solid ${brandColors.email.infoBorder}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.textPrimary
              }}>
                💡 ¿Necesitas ayuda?
              </Heading>
              <Text style={{ margin: 0, color: brandColors.textPrimary, lineHeight: '1.5' }}>
                Si tienes preguntas o necesitas asistencia para actualizar tu información, nuestro equipo de soporte está disponible para ayudarte.
              </Text>
            </Section>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={`mailto:${brandInfo.infoEmail}`}
                style={{
                  backgroundColor: brandColors.secondary,
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
                📧 Contactar Soporte
              </Button>
            </Section>

            <Hr style={{ margin: '30px 0', borderColor: brandColors.border }} />

            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              textAlign: 'center',
              margin: '20px 0 0 0'
            }}>
              Este es un correo automático. Por favor, no respondas a este mensaje.
            </Text>
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
                    Todos los derechos reservados | <a href={privacyUrl} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Aviso de Privacidad</a> | <a href={termsUrl} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Términos y Condiciones</a>
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

export default ActorRejectionEmail;
