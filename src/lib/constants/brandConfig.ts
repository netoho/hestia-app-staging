/**
 * Brand Configuration Constants
 * Centralized brand values for emails and UI
 */

/** Company information */
export const COMPANY_CONFIG = {
  name: 'Hestia',
  supportEmail: 'soporte@hestiaplp.com.mx',
} as const;

/** Brand colors */
export const BRAND_COLORS = {
  /** Primary brand color (dark blue) */
  primary: '#173459',
  /** Accent color (coral) */
  accent: '#FF7F50',
  /** Link color */
  link: '#007bff',
  /** Success color */
  success: '#28a745',
  /** Error/danger color */
  error: '#dc3545',
  /** Warning color */
  warning: '#ffc107',
  /** Light background */
  lightBg: '#f8f9fa',
  /** White */
  white: '#ffffff',
} as const;

/** Email styling configuration */
export const EMAIL_STYLE = {
  maxWidth: '600px',
  padding: '20px',
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  lineHeight: '1.6',
} as const;

/** Combined brand config for convenience */
export const BRAND_CONFIG = {
  company: COMPANY_CONFIG,
  colors: BRAND_COLORS,
  email: EMAIL_STYLE,
} as const;
