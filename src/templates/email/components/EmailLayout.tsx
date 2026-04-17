import React from 'react';
import { Html, Head, Body, Container } from '@react-email/components';
import { brandColors } from '@/lib/config/brand';

interface EmailLayoutProps {
  children: React.ReactNode;
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: brandColors.background,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
};

export const EmailLayout: React.FC<EmailLayoutProps> = ({ children }) => (
  <Html>
    <Head />
    <Body style={bodyStyle}>
      <Container style={containerStyle}>{children}</Container>
    </Body>
  </Html>
);

export default EmailLayout;
