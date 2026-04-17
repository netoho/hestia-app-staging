import React from 'react';
import { Section, Heading, Text } from '@react-email/components';
import { brandColors } from '@/lib/config/brand';

interface EmailWarningBoxProps {
  title?: string;
  children: React.ReactNode;
  tone?: 'warning' | 'danger';
}

export const EmailWarningBox: React.FC<EmailWarningBoxProps> = ({
  title,
  children,
  tone = 'warning',
}) => {
  const borderColor =
    tone === 'danger' ? brandColors.danger : brandColors.email.warningBorder;
  const bg =
    tone === 'danger' ? '#fee2e2' : brandColors.email.warningBackground;
  const titleColor = tone === 'danger' ? brandColors.danger : brandColors.warning;

  return (
    <Section
      style={{
        backgroundColor: bg,
        border: `2px solid ${borderColor}`,
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0',
      }}
    >
      {title ? (
        <Heading
          style={{
            margin: '0 0 10px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: titleColor,
          }}
        >
          {tone === 'danger' ? '🚨' : '⚠️'} {title}
        </Heading>
      ) : null}
      <Text style={{ margin: 0, color: brandColors.textPrimary }}>{children}</Text>
    </Section>
  );
};

export default EmailWarningBox;
