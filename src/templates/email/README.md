# Hestia Email Templates

## Overview
Modern, responsive email templates with Hestia brand guidelines and comprehensive provider support.

## Features
- **📱 Responsive Design**: Mobile-first approach with consistent rendering across email clients
- **🎨 Brand Consistency**: Hestia color palette, typography, and visual identity
- **🌐 Multi-provider Support**: SMTP, Resend, and Mailgun integration
- **🇲🇽 Localized Content**: Spanish language templates for Mexican market
- **⚡ Performance**: React-based templates with static HTML generation
- **🔧 Fallback System**: Graceful degradation if React rendering fails

## Template Structure

```
src/templates/email/
├── components/
│   ├── BaseEmailTemplate.tsx    # Base template with brand styling
│   ├── Button.tsx               # Branded email buttons
│   └── InfoBox.tsx             # Status boxes and alerts
├── PolicyInvitationEmail.tsx    # Policy invitation template
├── PolicySubmissionEmail.tsx    # Submission confirmation template
├── PolicyStatusUpdateEmail.tsx  # Approval/denial notification
└── README.md                   # This documentation

src/lib/utils/
└── emailRenderer.ts            # Server-side React email renderer
```

## Brand Guidelines

### Colors
- **Primary**: `#1a365d` (Deep blue)
- **Secondary**: `#2b77e6` (Bright blue)
- **Success**: `#38a169` (Green)
- **Warning**: `#d69e2e` (Orange)
- **Danger**: `#e53e3e` (Red)

### Typography
- **Font Stack**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
- **Headings**: 600 weight, proper spacing
- **Body**: 400 weight, 1.6 line height

## Email Provider Configuration

### SMTP (HostGator)
```env
EMAIL_PROVIDER="smtp"
EMAIL_FROM="noreply@yourdomain.com"
SUPPORT_EMAIL="soporte@yourdomain.com"
SMTP_HOST="gator4xxx.hostgator.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@yourdomain.com"
SMTP_PASS="your-password"
```

### Resend
```env
EMAIL_PROVIDER="resend"
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="re_xxxxxxxxxx"
```

### Mailgun
```env
EMAIL_PROVIDER="mailgun"
EMAIL_FROM="noreply@yourdomain.com"
MAILGUN_API_KEY="key-xxxxxxxxxx"
MAILGUN_DOMAIN="mg.yourdomain.com"
```

## Usage

### Sending Emails
```typescript
import { sendPolicyInvitation } from '@/lib/services/emailService';

await sendPolicyInvitation({
  tenantEmail: 'usuario@ejemplo.com',
  tenantName: 'Juan Pérez',
  propertyAddress: 'Av. Reforma 123, CDMX',
  accessToken: 'policy-token-123',
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  initiatorName: 'María González'
});
```

### Server-Side Rendering
The email templates use React components that are rendered server-side. The system automatically:
1. **Tries modern templates**: Uses React components with `renderToStaticMarkup`
2. **Falls back gracefully**: Uses legacy HTML templates if React rendering fails
3. **Dynamic imports**: Avoids bundling server-side code in client bundle

### Testing
```bash
# Test all email templates
bun run test:email

# Test with specific email
TEST_EMAIL=user@example.com bun run test:email

# Test in demo mode (no actual emails sent)
DEMO_MODE=true bun run test:email
```

## Template Features

### PolicyInvitationEmail
- **Purpose**: Invite tenants to complete policy application
- **Key Elements**: 
  - Clear call-to-action button
  - Expiration warning
  - Document checklist
  - Professional branding

### PolicySubmissionEmail
- **Purpose**: Confirm receipt of completed application
- **Key Elements**:
  - Application ID for reference
  - Timeline expectations
  - Next steps explanation
  - Contact information

### PolicyStatusUpdateEmail
- **Purpose**: Notify of approval/denial decision
- **Key Elements**:
  - Clear status indication
  - Conditional content based on result
  - Next steps for both scenarios
  - Support contact options

## Responsive Design

All templates are optimized for:
- **Desktop**: Full-width layout with proper spacing
- **Mobile**: Single-column, touch-friendly buttons
- **Email Clients**: Tested with Gmail, Outlook, Apple Mail
- **Dark Mode**: Appropriate contrast ratios

## Accessibility

- **Color Contrast**: WCAG 2.1 AA compliant
- **Font Sizes**: Minimum 14px for body text
- **Alt Text**: Provided for all images
- **Semantic HTML**: Proper heading hierarchy

## Best Practices

1. **Keep it Simple**: Focus on single primary action
2. **Mobile First**: Design for mobile, enhance for desktop
3. **Brand Consistent**: Use established colors and fonts
4. **Clear Hierarchy**: Important information stands out
5. **Test Thoroughly**: Verify across email clients

## Maintenance

- Update brand colors in `BaseEmailTemplate.tsx`
- Add new templates following existing patterns
- Test new templates with `bun run test:email`
- Maintain fallback templates for compatibility