import React from 'react';
import { Section, Heading, Text } from '@react-email/components';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

interface EmailHeaderProps {
  title: string;
  subtitle?: string;
}

const wrapperStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${brandColors.email.headerGradientStart} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
  padding: '30px',
  textAlign: 'center',
  borderRadius: '12px 12px 0 0',
};

const logoStyle: React.CSSProperties = { margin: '0 auto' };

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: brandColors.textPrimary,
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '-0.025em',
};

const subtitleStyle: React.CSSProperties = {
  margin: '8px 0 0 0',
  color: brandColors.textSecondary,
  fontSize: '16px',
  fontWeight: 400,
};

export const EmailHeader: React.FC<EmailHeaderProps> = ({ title, subtitle }) => (
  <Section style={wrapperStyle}>
    <img
      src={`${brandUrls.production}${brandUrls.logo.colorTop}`}
      alt={brandInfo.name}
      width="150"
      height="50"
      style={logoStyle}
    />
    <Heading style={titleStyle}>{title}</Heading>
    {subtitle ? <Text style={subtitleStyle}>{subtitle}</Text> : null}
  </Section>
);

export default EmailHeader;
