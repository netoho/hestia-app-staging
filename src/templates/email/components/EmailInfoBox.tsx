import React from 'react';
import { Section, Text } from '@react-email/components';
import { brandColors } from '@/lib/config/brand';

interface EmailInfoBoxProps {
  children: React.ReactNode;
  icon?: string;
}

const wrapperStyle: React.CSSProperties = {
  backgroundColor: brandColors.email.infoBackground,
  border: `2px solid ${brandColors.email.infoBorder}`,
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
};

export const EmailInfoBox: React.FC<EmailInfoBoxProps> = ({ children, icon = '💡' }) => (
  <Section style={wrapperStyle}>
    <Text style={{ margin: 0, color: brandColors.textPrimary }}>
      {icon} {children}
    </Text>
  </Section>
);

export default EmailInfoBox;
