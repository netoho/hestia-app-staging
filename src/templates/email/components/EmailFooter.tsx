import React from 'react';
import { Section, Text, Img } from '@react-email/components';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || brandUrls.production;

const wrapperStyle: React.CSSProperties = {
  marginTop: '40px',
  paddingTop: '30px',
  borderTop: `2px solid ${brandColors.border}`,
};

const taglineStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  color: brandColors.textMuted,
  fontStyle: 'italic',
};

const contactCellStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: brandColors.textMuted,
};

const legalLinkStyle: React.CSSProperties = {
  color: brandColors.secondary,
  textDecoration: 'none',
};

export const EmailFooter: React.FC = () => (
  <Section style={wrapperStyle}>
    <table style={{ width: '100%' }}>
      <tbody>
        <tr>
          <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <Img
              src={`${APP_URL}${brandUrls.logo.colorTop}`}
              alt={`${brandInfo.name} Logo`}
              width="140"
              height="40"
              style={{ margin: '0 auto', display: 'block' }}
            />
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center', paddingBottom: '15px' }}>
            <Text style={taglineStyle}>{brandInfo.tagline}</Text>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <table style={{ margin: '0 auto' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0 15px' }}>
                    <Text style={contactCellStyle}>📧 {brandInfo.supportEmail}</Text>
                  </td>
                  <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                    <Text style={contactCellStyle}>📱 {brandInfo.supportPhone}</Text>
                  </td>
                  <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                    <Text style={contactCellStyle}>📍 {brandInfo.location}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td
            style={{
              textAlign: 'center',
              paddingTop: '15px',
              borderTop: `1px solid ${brandColors.border}`,
            }}
          >
            <Text style={{ margin: '10px 0 0 0', fontSize: '12px', color: brandColors.textMuted }}>
              © {new Date().getFullYear()} {brandInfo.companyLegalName}
            </Text>
            <Text style={{ margin: '5px 0 0 0', fontSize: '11px', color: brandColors.textMuted }}>
              Todos los derechos reservados |{' '}
              <a href={`${APP_URL}${brandUrls.legal.privacy}`} style={legalLinkStyle}>
                Aviso de Privacidad
              </a>{' '}
              |{' '}
              <a href={`${APP_URL}${brandUrls.legal.terms}`} style={legalLinkStyle}>
                Términos y Condiciones
              </a>
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  </Section>
);

export default EmailFooter;
