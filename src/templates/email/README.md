# Hestia Email Templates

**Status**: Production-Ready
**Last Updated**: December 2024
**Templates**: 10 React email templates

---

## Overview

Modern, responsive email templates using React Email library with Hestia brand guidelines and multi-provider support.

## Template Structure

```
src/templates/email/
├── react-email/
│   ├── ActorIncompleteReminderEmail.tsx  # Reminder for incomplete actors
│   ├── ActorInvitationEmail.tsx          # Actor portal invitation
│   ├── ActorRejectionEmail.tsx           # Actor rejection notification
│   ├── JoinUsNotificationEmail.tsx       # New user signup notification
│   ├── PasswordResetEmail.tsx            # Password reset link
│   ├── PolicyCreatorSummaryEmail.tsx     # Policy summary for creators
│   ├── PolicyInvitationEmail.tsx         # Policy invitation
│   ├── PolicyStatusUpdateEmail.tsx       # Approval/denial notification
│   ├── PolicySubmissionEmail.tsx         # Submission confirmation
│   └── UserInvitationEmail.tsx           # User invitation to platform
└── README.md
```

## Available Templates

| Template | Purpose |
|----------|---------|
| `ActorIncompleteReminderEmail` | Remind actors to complete their information |
| `ActorInvitationEmail` | Invite actors to submit their information |
| `ActorRejectionEmail` | Notify actors of rejection with reason |
| `JoinUsNotificationEmail` | Welcome new users to platform |
| `PasswordResetEmail` | Password reset with secure link |
| `PolicyCreatorSummaryEmail` | Summary for policy initiators |
| `PolicyInvitationEmail` | Invite tenants to policy application |
| `PolicyStatusUpdateEmail` | Approval/denial decisions |
| `PolicySubmissionEmail` | Confirm receipt of application |
| `UserInvitationEmail` | Invite users to join platform |

## Brand Guidelines

### Colors
- **Primary**: `#1a365d` (Deep blue)
- **Secondary**: `#2b77e6` (Bright blue)
- **Success**: `#38a169` (Green)
- **Warning**: `#d69e2e` (Orange)
- **Danger**: `#e53e3e` (Red)

### Typography
- **Font Stack**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif

## Email Provider Configuration

### SMTP
```env
EMAIL_PROVIDER="smtp"
EMAIL_FROM="noreply@yourdomain.com"
SMTP_HOST="smtp.yourdomain.com"
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

```typescript
import { sendPolicyInvitation } from '@/lib/services/emailService';

await sendPolicyInvitation({
  tenantEmail: 'usuario@ejemplo.com',
  tenantName: 'Juan Perez',
  propertyAddress: 'Av. Reforma 123, CDMX',
  accessToken: 'policy-token-123',
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  initiatorName: 'Maria Gonzalez'
});
```

## Testing

```bash
# Test all email templates
bun run test:email

# Test with specific email
TEST_EMAIL=user@example.com bun run test:email

# Test in demo mode (no actual emails sent)
DEMO_MODE=true bun run test:email
```

## Related

- [Email Service](../../lib/services/emailService.ts) - Email sending service
- [Services Layer](../../lib/services/README.md) - Service architecture
