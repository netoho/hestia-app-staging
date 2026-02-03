import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Img,
  Button,
} from '@react-email/components';
import { AllPaymentsCompletedData } from '@/lib/services/emailService';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';
import { formatCurrency } from '@/lib/utils/currency';

type AllPaymentsCompletedEmailProps = Omit<AllPaymentsCompletedData, 'adminEmail'>;

export const AllPaymentsCompletedEmail: React.FC<AllPaymentsCompletedEmailProps> = ({
  policyNumber,
  totalPayments,
  totalAmount,
}) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || brandUrls.production;

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
            background: `linear-gradient(135deg, ${brandColors.success} 0%, #059669 100%)`,
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
              margin: '16px 0 0 0',
              color: brandColors.white,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Pagos Completados
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Notificacion de administrador
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
              Poliza Lista para Activar
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Todos los pagos de la poliza <strong>{policyNumber}</strong> han sido completados.
            </Text>

            {/* Payment Summary Box */}
            <Section style={{
              backgroundColor: '#f0fff4',
              border: '2px solid #9ae6b4',
              borderLeft: `4px solid ${brandColors.success}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.success
              }}>
                Resumen de Pagos
              </Heading>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Poliza:</td>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: brandColors.textPrimary, textAlign: 'right' }}>{policyNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Total de pagos:</td>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: brandColors.textPrimary, textAlign: 'right' }}>{totalPayments}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Monto total:</td>
                    <td style={{ padding: '8px 0', fontWeight: '700', color: brandColors.success, textAlign: 'right', fontSize: '18px' }}>{formatCurrency(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={`${appUrl}/dashboard/policies`}
                style={{
                  backgroundColor: brandColors.primary,
                  color: brandColors.white,
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Ver Poliza
              </Button>
            </Section>

            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              marginTop: '24px',
              textAlign: 'center'
            }}>
              Esta es una notificacion automatica del sistema.
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
                      src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
                      alt="Hestia Logo"
                      width="140"
                      height="40"
                      style={{ margin: '0 auto', display: 'block' }}
                    />
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

export default AllPaymentsCompletedEmail;
