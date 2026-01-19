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

export interface ActorIncompleteReminderEmailProps {
  actorName: string;
  actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
  policyNumber: string;
  actorLink: string;
  email: string;
}

const actorTypeLabels: Record<string, string> = {
  landlord: 'Arrendador',
  tenant: 'Arrendatario',
  jointObligor: 'Obligado Solidario',
  aval: 'Aval'
};

export const ActorIncompleteReminderEmail: React.FC<ActorIncompleteReminderEmailProps> = ({
  actorName,
  actorType,
  policyNumber,
  actorLink,
}) => {
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
              margin: '16px 0 0 0',
              color: brandColors.textPrimary,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Recordatorio
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Complete su información para la póliza
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
              Este es un recordatorio diario para completar su información como <strong>{actorTypeLabel}</strong> para la póliza <strong>{policyNumber}</strong>.
            </Text>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Su información está incompleta y es necesaria para procesar la póliza. Por favor, tómese unos minutos para completar el formulario.
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={actorLink}
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
                Completar mi información
              </Button>
            </Section>

            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textMuted,
              margin: '16px 0',
              textAlign: 'center'
            }}>
              Este enlace es único para usted. No lo comparta con nadie más.
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
                    <img
                      src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
                      alt={brandInfo.name}
                      width="150"
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
                      <tbody>
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
                        </tr>
                      </tbody>
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

export default ActorIncompleteReminderEmail;
