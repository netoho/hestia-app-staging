/**
 * Hestia Brand Configuration
 * Centralized brand colors and styling constants
 */

export const brandColors = {
  // Primary palette - Dark Blue theme (from globals.css)
  primary: '#173459',        // hsl(214, 59%, 22%) - Dark Blue - Main brand color
  primaryDark: '#0f2340',    // Darker variant
  primaryLight: '#2b5a8c',   // Lighter variant

  // Secondary palette - Lighter Blue shades
  secondary: '#5578a8',      // Medium Blue - Secondary actions
  secondaryDark: '#3d5d87',  // Darker Blue
  secondaryLight: '#7a9bc7', // Lighter Blue

  // Accent colors - Coral/Orange (from globals.css)
  accent: '#FF7F50',         // hsl(16, 100%, 66%) - Coral - Success/CTAs
  accentDark: '#ff6333',     // Darker Coral
  accentLight: '#ff9973',    // Lighter Coral

  // Status colors
  success: '#10b981',        // Emerald-500
  warning: '#f59e0b',        // Amber-500
  danger: '#ef4444',         // Red-500
  info: {
    bg: '#dbeafe',          // Blue-100
    border: '#60a5fa',      // Blue-400
    text: '#1e40af',        // Blue-800
  },

  // Text colors
  textPrimary: '#2d3e52',    // Dark Blue-Gray - Main text (from globals.css)
  textSecondary: '#4b5563',  // Gray-600 - Secondary text
  textMuted: '#6b7280',      // Gray-500 - Muted/disabled text
  textLight: '#d1d5db',      // Gray-300 - Very light text

  // Background colors
  background: '#dde2e9',     // hsl(220, 20%, 90%) - Light Bluish Gray (from globals.css)
  backgroundAlt: '#f3f4f6',  // Gray-100 - Alternative background
  backgroundMuted: '#e5e7eb', // Gray-200 - Muted sections

  // Utility colors
  white: '#ffffff',
  black: '#000000',
  border: '#d4dae1',         // Light Gray-Blue borders (from globals.css)
  borderDark: '#b8c1ce',     // Darker borders
  link: '#2b5a8c',           // Dark Blue - Link color

  // Email-specific colors (for better email client support)
  email: {
    headerGradientStart: '#ffffff',  // Dark Blue
    headerGradientEnd: '#dbeafe',    // Lighter Blue
    linkColor: '#2b5a8c',            // Blue link
    buttonShadow: 'rgba(23, 52, 89, 0.2)',  // Dark Blue shadow
    warningBackground: '#fef3c7',
    warningBorder: '#fcd34d',
    infoBackground: '#f0fdf4',
    infoBorder: '#86efac',
  }
} as const;

export const brandFonts = {
  // Font families (from globals.css)
  headline: "'Libre Baskerville', serif",
  display: "'Libre Baskerville', serif",
  body: "'PT Sans', sans-serif",
  mono: 'Consolas, monospace',

  // Font sizes for email templates
  email: {
    heading1: '28px',
    heading2: '24px',
    heading3: '20px',
    body: '16px',
    small: '14px',
    tiny: '12px',
  }
} as const;

export const brandInfo = {
  name: 'Hestia',
  companyName: 'Hestia',
  legalName: 'Hestia Protección Legal y Patrimonial S.A.S de C.V.',
  companyLegalName: 'Hestia Protección Legal y Patrimonial S.A.S de C.V.',
  companyShortName: 'Hestia PLP',
  tagline: 'Tu garantía de confianza en el arrendamiento',
  supportEmail: 'info@hestiaplp.com.mx',
  infoEmail: 'info@hestiaplp.com.mx',
  supportPhone: '55 1277 0883 | 55 2111 7610',
  location: 'Ciudad de México',
  website: 'https://hestiaplp.com.mx',
} as const;

export const brandUrls = {
  production: 'https://hestiaplp.com.mx',
  logo: {
    colorTop: '/images/logo-hestia-azul-top.png',
    white: '/images/logo-hestia-blanco.png',
    colorFull: '/images/logo-hestia-azul.png',
  },
  legal: {
    privacy: '/privacy-policy',
    terms: '/terms-and-conditions',
    cookies: '/cookies',
  },
  social: {
    facebook: 'https://facebook.com/hestiaplp',
    twitter: 'https://twitter.com/hestiaplp',
    linkedin: 'https://linkedin.com/company/hestiaplp',
    instagram: 'https://instagram.com/hestiaplp',
  }
} as const;

export type BrandColors = typeof brandColors;
export type BrandFonts = typeof brandFonts;
export type BrandInfo = typeof brandInfo;
export type BrandUrls = typeof brandUrls;
