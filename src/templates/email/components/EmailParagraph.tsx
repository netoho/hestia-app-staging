import React from 'react';
import { Text } from '@react-email/components';
import { brandColors } from '@/lib/config/brand';

interface EmailParagraphProps {
  children: React.ReactNode;
  size?: 'body' | 'small';
  emphasis?: boolean;
}

const sizes = { body: '16px', small: '14px' } as const;

export const EmailParagraph: React.FC<EmailParagraphProps> = ({
  children,
  size = 'body',
  emphasis = false,
}) => (
  <Text
    style={{
      fontSize: sizes[size],
      lineHeight: 1.6,
      color: brandColors.textPrimary,
      margin: '16px 0',
      fontWeight: emphasis ? 600 : 400,
    }}
  >
    {children}
  </Text>
);

export default EmailParagraph;
