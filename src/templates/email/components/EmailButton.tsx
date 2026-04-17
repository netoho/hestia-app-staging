import React from 'react';
import { Button, Section } from '@react-email/components';
import { brandColors } from '@/lib/config/brand';

type Variant = 'primary' | 'accent' | 'whatsapp' | 'danger';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  center?: boolean;
}

const palette: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: brandColors.primary, text: brandColors.white },
  accent: { bg: brandColors.accent, text: brandColors.white },
  whatsapp: { bg: '#25D366', text: brandColors.white },
  danger: { bg: brandColors.danger, text: brandColors.white },
};

export const EmailButton: React.FC<EmailButtonProps> = ({
  href,
  children,
  variant = 'primary',
  center = true,
}) => {
  const { bg, text } = palette[variant];
  const buttonStyle: React.CSSProperties = {
    backgroundColor: bg,
    color: text,
    padding: '16px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: `0 4px 6px ${brandColors.email.buttonShadow}`,
    display: 'inline-block',
  };

  const button = (
    <Button href={href} style={buttonStyle}>
      {children}
    </Button>
  );

  if (!center) return button;
  return <Section style={{ textAlign: 'center', margin: '24px 0' }}>{button}</Section>;
};

export default EmailButton;
