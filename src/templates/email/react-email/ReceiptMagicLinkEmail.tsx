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

export interface ReceiptMagicLinkEmailProps {
  tenantName: string;
  email: string;
  portalUrl: string;
}

export const ReceiptMagicLinkEmail: React.FC<ReceiptMagicLinkEmailProps> = ({
  tenantName,
  portalUrl,
}) => {
  const privacyUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.privacy}`;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.terms}`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: brandColors.background, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
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
              letterSpacing: '-0.025em',
            }}>
              Accede a tu Portal
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
            }}>
              Portal de Comprobantes de Pago
            </Text>
          </Section>

          {/* Content */}
          <Section style={{
            backgroundColor: brandColors.white,
            padding: '40px 30px',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}>
            <Heading style={{
              color: brandColors.textPrimary,
              marginTop: 0,
              fontSize: '24px',
              fontWeight: '600',
            }}>
              Hola {tenantName},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0',
            }}>
              Haz clic en el siguiente botón para acceder a tu portal de comprobantes donde podrás subir y consultar tus recibos de pago.
            </Text>

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={portalUrl}
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
                  display: 'inline-block',
                }}
              >
                Acceder al Portal
              </Button>
            </Section>

            {/* Warning box */}
            <Section style={{
              backgroundColor: brandColors.email.warningBackground,
              border: `2px solid ${brandColors.email.warningBorder}`,
              padding: '16px',
              borderRadius: '8px',
              margin: '20px 0',
            }}>
              <Text style={{ margin: 0, fontSize: '14px', color: brandColors.textPrimary }}>
                Este enlace es personal y de un solo uso. No lo compartas con nadie.
              </Text>
            </Section>

            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textMuted,
              margin: '16px 0',
              textAlign: 'center',
            }}>
              Si no solicitaste este enlace, puedes ignorar este correo.
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
                    <Text style={{ margin: '0', fontSize: '14px', color: brandColors.textMuted, fontStyle: 'italic' }}>
                      {brandInfo.tagline}
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingTop: '15px', borderTop: `1px solid ${brandColors.border}` }}>
                    <Text style={{ margin: '10px 0 0 0', fontSize: '12px', color: brandColors.textMuted }}>
                      &copy; {new Date().getFullYear()} {brandInfo.companyLegalName}
                    </Text>
                    <Text style={{ margin: '5px 0 0 0', fontSize: '11px', color: brandColors.textMuted }}>
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

export default ReceiptMagicLinkEmail;
