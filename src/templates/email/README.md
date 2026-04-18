# Hestia Email Templates

**Status**: Production-Ready
**Templates**: 23 React email templates + shared component library

---

## Overview

Modern, responsive email templates using React Email with Hestia brand guidelines and multi-provider support (Resend / Mailgun / SMTP).

## Template Structure

```
src/templates/email/
├── components/                               # Shared building blocks (reused by every template)
│   ├── EmailLayout.tsx                       # <Html>/<Head>/<Body> shell
│   ├── EmailHeader.tsx                       # Gradient banner + logo + title/subtitle
│   ├── EmailFooter.tsx                       # Tagline + contact + copyright + legal links
│   ├── EmailButton.tsx                       # CTA with variants: primary | accent | whatsapp | danger
│   ├── EmailInfoBox.tsx                      # Info alert block
│   ├── EmailWarningBox.tsx                   # Warning / danger alert block
│   ├── EmailParagraph.tsx                    # Consistent body paragraph
│   ├── EmailSection.tsx                      # White content section with optional greeting
│   ├── whatsappUrl.ts                        # Builds wa.me link from NEXT_PUBLIC_WHATSAPP_NUMBER
│   └── index.ts                              # Re-exports
├── react-email/
│   ├── ActorIncompleteReminderEmail.tsx      # Reminder for incomplete actors
│   ├── ActorInvitationEmail.tsx              # Actor portal invitation
│   ├── ActorRejectionEmail.tsx               # Actor rejection (defined but NOT currently wired)
│   ├── AllPaymentsCompletedEmail.tsx         # All payments completed notification
│   ├── InvestigationApprovalRequestEmail.tsx # Request approval for investigation
│   ├── InvestigationResultEmail.tsx          # Investigation result notification
│   ├── InvestigationSubmittedEmail.tsx       # Investigation submission confirmation
│   ├── JoinUsNotificationEmail.tsx           # New user signup notification
│   ├── PasswordResetConfirmationEmail.tsx    # Confirmation that password was changed
│   ├── PasswordResetEmail.tsx                # Password reset link
│   ├── PaymentCompletedEmail.tsx             # Single payment completed notification
│   ├── PolicyCancellationEmail.tsx           # Policy cancellation notification
│   ├── PolicyCreatorSummaryEmail.tsx         # Policy summary for creators
│   ├── PolicyExpirationReminderEmail.tsx     # Pre-expiration reminder (5 tiers)
│   ├── PolicyInvitationEmail.tsx             # Policy invitation
│   ├── PolicyPendingApprovalEmail.tsx        # Policy ready for final approval
│   ├── PolicyQuarterlyFollowupEmail.tsx      # Quarterly service follow-up
│   ├── PolicyStatusUpdateEmail.tsx           # Approval/denial notification
│   ├── PolicySubmissionEmail.tsx             # Submission confirmation
│   ├── ReceiptMagicLinkEmail.tsx             # Magic link for receipt access
│   ├── ReceiptReminderEmail.tsx              # Receipt payment reminder
│   ├── TenantReplacementEmail.tsx            # Tenant replaced in an existing policy
│   └── UserInvitationEmail.tsx               # User invitation to platform
└── README.md
```

## Available Templates

| Template | Purpose | Wired? |
|----------|---------|--------|
| `ActorIncompleteReminderEmail` | Daily reminder to actors with missing info | ✅ |
| `ActorInvitationEmail` | Invite actors to submit their information | ✅ |
| `ActorRejectionEmail` | Notify actors of rejection with reason | ⚠️ Not currently called — kept as a ready-to-wire template |
| `AllPaymentsCompletedEmail` | Notify admins when all payments have settled | ✅ |
| `InvestigationApprovalRequestEmail` | Ask broker/landlord to approve an investigation | ✅ |
| `InvestigationResultEmail` | Notify of investigation result | ✅ |
| `InvestigationSubmittedEmail` | Confirm investigation submission to admins | ✅ |
| `JoinUsNotificationEmail` | Notify admin of a new advisor application | ✅ |
| `PasswordResetConfirmationEmail` | Confirm password was changed | ✅ |
| `PasswordResetEmail` | Password reset with secure link | ✅ |
| `PaymentCompletedEmail` | Notify payer when a single payment is completed | ✅ |
| `PolicyCancellationEmail` | Notify admins of policy cancellation | ✅ |
| `PolicyCreatorSummaryEmail` | Daily summary for policy initiators | ✅ |
| `PolicyExpirationReminderEmail` | Pre-expiration reminder (60/45/30/14/1d) | ✅ |
| `PolicyInvitationEmail` | Invite tenants to policy application | ✅ |
| `PolicyPendingApprovalEmail` | Admin notice: policy ready for approval | ✅ |
| `PolicyQuarterlyFollowupEmail` | Quarterly check-in with landlord | ✅ |
| `PolicyStatusUpdateEmail` | Approval/denial decisions | ✅ |
| `PolicySubmissionEmail` | Confirm receipt of application | ✅ |
| `ReceiptMagicLinkEmail` | Magic link for accessing a receipt | ✅ |
| `ReceiptReminderEmail` | Monthly receipt reminder | ✅ |
| `TenantReplacementEmail` | Notify admins/manager when a tenant is replaced | ✅ |
| `UserInvitationEmail` | Invite users to join the platform | ✅ |

## Shared Components

All templates are built from the primitives under `components/`. This removes per-template duplication of the header, footer, button, and alert blocks.

```tsx
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailParagraph,
  EmailButton,
  EmailInfoBox,
  EmailFooter,
} from '../components';

export const MyEmail = ({ name, url }: { name: string; url: string }) => (
  <EmailLayout>
    <EmailHeader title="Mi asunto" subtitle="subtítulo opcional" />
    <EmailSection greeting={`Hola ${name},`}>
      <EmailParagraph>Texto principal del correo.</EmailParagraph>
      <EmailInfoBox>Una pista o nota breve.</EmailInfoBox>
      <EmailButton href={url}>Acción principal</EmailButton>
    </EmailSection>
    <EmailFooter />
  </EmailLayout>
);
```

### WhatsApp CTA

Use `buildWhatsAppUrl(message)` from `components/whatsappUrl.ts` to generate a `wa.me` link pre-filled with a message. Returns `null` when `NEXT_PUBLIC_WHATSAPP_NUMBER` is unset, so callers can conditionally render the button.

### Cron-driven reminders

| Cron path | Schedule (UTC) | Template |
|-----------|----------------|----------|
| `/api/cron/incomplete-actors-reminder` | `30 17 * * *` | `ActorIncompleteReminderEmail`, `PolicyCreatorSummaryEmail` |
| `/api/cron/receipt-reminder` | `0 15 1 * *` | `ReceiptReminderEmail` |
| `/api/cron/policy-expiry` | `0 12 * * *` | — (status flip only; no email) |
| `/api/cron/policy-expiration-reminder` | `0 13 * * *` | `PolicyExpirationReminderEmail` (tiers 60/45/30/14/1) |
| `/api/cron/policy-quarterly-followup` | `30 13 * * *` | `PolicyQuarterlyFollowupEmail` |

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
