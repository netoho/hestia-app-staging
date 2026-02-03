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
} from '@react-email/components';
import { PaymentCompletedData } from '@/lib/services/emailService';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';
import { formatDateLong } from '@/lib/utils/formatting';
import { formatCurrency } from '@/lib/utils/currency';

type PaymentCompletedEmailProps = Omit<PaymentCompletedData, 'email'>;

export const PaymentCompletedEmail: React.FC<PaymentCompletedEmailProps> = ({
  payerName,
  policyNumber,
  paymentType,
  amount,
  paidAt,
}) => {
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
              Pago Confirmado
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Tu pago ha sido procesado exitosamente
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
              ¡Gracias{payerName ? `, ${payerName}` : ''}!
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Hemos recibido tu pago correctamente.
            </Text>

            {/* Payment Details Box */}
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
                Detalles del Pago
              </Heading>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Poliza:</td>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: brandColors.textPrimary, textAlign: 'right' }}>{policyNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Concepto:</td>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: brandColors.textPrimary, textAlign: 'right' }}>{paymentType}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Monto:</td>
                    <td style={{ padding: '8px 0', fontWeight: '700', color: brandColors.success, textAlign: 'right', fontSize: '18px' }}>{formatCurrency(amount)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Fecha:</td>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: brandColors.textPrimary, textAlign: 'right' }}>{formatDateLong(paidAt)}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              marginTop: '24px'
            }}>
              Si tienes alguna pregunta sobre tu pago, no dudes en contactarnos.
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
                            {brandInfo.supportEmail}
                          </Text>
                        </td>
                        <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            {brandInfo.supportPhone}
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

export default PaymentCompletedEmail;
