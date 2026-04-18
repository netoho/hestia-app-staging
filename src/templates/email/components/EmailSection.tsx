import React from 'react';
import { Section, Heading } from '@react-email/components';
import { brandColors } from '@/lib/config/brand';

interface EmailSectionProps {
  children: React.ReactNode;
  greeting?: string;
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: brandColors.white,
  padding: '40px 30px',
  border: '1px solid #e2e8f0',
  borderTop: 'none',
  borderRadius: '0 0 12px 12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const greetingStyle: React.CSSProperties = {
  color: brandColors.textPrimary,
  marginTop: 0,
  fontSize: '24px',
  fontWeight: 600,
};

export const EmailSection: React.FC<EmailSectionProps> = ({ children, greeting }) => (
  <Section style={sectionStyle}>
    {greeting ? <Heading style={greetingStyle}>{greeting}</Heading> : null}
    {children}
  </Section>
);

export default EmailSection;
