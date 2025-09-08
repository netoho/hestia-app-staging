/**
 * Hestia Brand Configuration
 * Centralized brand colors and styling constants
 */

export const brandColors = {
  // Primary palette - Purple theme
  primary: '#6d28d9',        // Purple-700 - Main brand color
  primaryDark: '#581c87',    // Purple-900 - Darker variant
  primaryLight: '#a855f7',   // Purple-500 - Lighter variant
  
  // Secondary palette
  secondary: '#a855f7',      // Purple-500 - Secondary actions
  secondaryDark: '#7c3aed',  // Purple-600
  secondaryLight: '#c084fc', // Purple-400
  
  // Accent colors
  accent: '#10b981',         // Emerald-500 - Success/CTAs
  accentDark: '#059669',     // Emerald-600
  accentLight: '#34d399',    // Emerald-400
  
  // Status colors
  success: '#10b981',        // Emerald-500
  warning: '#f59e0b',        // Amber-500
  danger: '#ef4444',         // Red-500
  info: '#3b82f6',          // Blue-500
  
  // Text colors
  textPrimary: '#1f2937',    // Gray-800 - Main text
  textSecondary: '#4b5563',  // Gray-600 - Secondary text
  textMuted: '#9ca3af',      // Gray-400 - Muted/disabled text
  textLight: '#d1d5db',      // Gray-300 - Very light text
  
  // Background colors
  background: '#fafafa',     // Neutral-50 - Main background
  backgroundAlt: '#f3f4f6',  // Gray-100 - Alternative background
  backgroundMuted: '#e5e7eb', // Gray-200 - Muted sections
  
  // Utility colors
  white: '#ffffff',
  black: '#000000',
  border: '#e5e7eb',         // Gray-200 - Default borders
  borderDark: '#d1d5db',     // Gray-300 - Darker borders
  
  // Email-specific colors (for better email client support)
  email: {
    headerGradientStart: '#6d28d9',
    headerGradientEnd: '#a855f7',
    linkColor: '#7c3aed',
    buttonShadow: 'rgba(109, 40, 217, 0.2)',
    warningBackground: '#fef3c7',
    warningBorder: '#fcd34d',
    infoBackground: '#f0fdf4',
    infoBorder: '#86efac',
  }
} as const;

export const brandFonts = {
  // Font families
  headline: 'Bw Stretch, system-ui, -apple-system, sans-serif',
  body: 'Inter, system-ui, -apple-system, sans-serif',
  mono: 'JetBrains Mono, Consolas, monospace',
  
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
  companyName: 'Hestia',
  companyLegalName: 'Hestia Propiedades Libres de Preocupación S.A. de C.V.',
  companyShortName: 'Hestia PLP',
  tagline: 'Tu garantía de confianza en el arrendamiento',
  supportEmail: 'soporte@hestiaplp.com.mx',
  supportPhone: '55-1234-5678',
  location: 'Ciudad de México',
  website: 'https://hestiaplp.com.mx',
} as const;

export const brandUrls = {
  logo: {
    colorTop: '/images/logo-hestia-azul-top.png',
    white: '/images/logo-hestia-blanco.png',
    colorFull: '/images/logo-hestia-azul.png',
  },
  legal: {
    privacy: '/privacy',
    terms: '/terms',
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