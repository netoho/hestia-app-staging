# Cron Jobs Implementation

## Overview
This document describes the cron jobs implementation for the Hestia rental guarantee platform, specifically the daily reminders for incomplete actor information.

## Architecture

### Vercel Cron Jobs
The system uses Vercel's built-in cron job functionality to schedule and execute tasks.

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/incomplete-actors-reminder",
      "schedule": "30 17 * * *"  // 17:30 UTC = 11:30 AM Mexico City
    }
  ]
}
```

### Components

#### 1. Cron Job Endpoint
**Path:** `/api/cron/incomplete-actors-reminder/route.ts`
- Validates request is from Vercel Cron (production)
- Checks authorization header with CRON_SECRET
- Calls reminder service
- Returns execution results

#### 2. Reminder Service
**Path:** `/src/services/reminderService.ts`
- Queries policies in `COLLECTING_INFO` status
- Identifies incomplete actors:
  - **Primary landlord only** (checks `isPrimary` flag)
  - **Tenant** (single relation)
  - **All joint obligors** (iterates through array)
  - **All avals** (iterates through array)
- Calls email service functions for clean separation

#### 3. Email Service Functions
**Path:** `/src/lib/services/emailService.ts`
- `sendActorIncompleteReminder()` - Sends personalized reminders to actors
- `sendPolicyCreatorSummary()` - Sends daily summary to policy creators
- Uses existing EmailProvider abstraction
- Supports Resend, Mailgun, and SMTP providers

#### 4. Test Endpoint
**Path:** `/api/cron/test-reminder/route.ts`
- Development-only endpoint for manual testing
- Bypasses cron scheduling
- Provides detailed execution feedback

## Daily Reminder Logic

### Schedule
- **Time:** 11:30 AM Mexico City time (CST/CDT)
- **Frequency:** Daily
- **Duration:** Continues until policy is completed or cancelled

### Process Flow
1. Find all policies with status = `COLLECTING_INFO`
2. For each policy:
   - Check each actor's `informationComplete` status
   - Collect incomplete actors with email addresses
   - Send personalized reminders to each incomplete actor
   - Send summary email to policy creator

### Email Templates

#### Actor Reminder
- Personalized greeting with actor name
- Policy number reference
- Direct link to complete information
- Branded with Hestia colors (Dark Blue #173459, Coral #FF7F50)

#### Creator Notification
- Summary of all incomplete actors
- Table format showing actor type, name, and email
- Link to policy dashboard
- Status of reminder sends

## Configuration

### Environment Variables

#### CRON_SECRET Setup (Critical for Production)

**Where to Configure:**
1. Go to Vercel Dashboard → Your Project
2. Navigate to Settings → Environment Variables
3. Add `CRON_SECRET` with a secure value
4. Generate secure value: `openssl rand -hex 32`

**How Vercel Uses It:**
- Vercel **automatically** adds `Authorization: Bearer {CRON_SECRET}` header to all cron requests
- You don't need to configure this anywhere else - Vercel handles it
- The cron job route checks for this header to ensure requests are legitimate

**Example:**
```env
# Generate with: openssl rand -hex 32
CRON_SECRET=a1b2c3d4e5f6789012345678901234567890123456789012345678901234567

# Email configuration
EMAIL_PROVIDER=resend|mailgun|smtp
EMAIL_FROM=info@hestiaplp.com.mx

# For Resend
RESEND_API_KEY=your-resend-key

# For Mailgun
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain

# For SMTP
SMTP_HOST=mail.hestiaplp.com.mx
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@hestiaplp.com.mx
SMTP_PASS=your-password
```

## Testing

### Local Development
```bash
# Test the reminder service directly
curl http://localhost:9002/api/cron/test-reminder
```

### Production Testing
The cron job will run automatically at the scheduled time. Monitor logs in Vercel dashboard.

## Monitoring

### Logs
- All reminder sends are logged to console
- Check Vercel Functions logs for execution details
- Look for `[REMINDER]` prefix in logs

### Metrics Tracked
- `policiesProcessed`: Number of policies checked
- `remindersSent`: Number of successful email sends
- `errors`: Array of error messages if any failures

## Security

### Authorization
- Production requires `CRON_SECRET` in authorization header
- Vercel adds `x-vercel-cron: 1` header automatically
- Test endpoint only works in development

### Data Protection
- Actor tokens are unique and secure
- Email addresses are not logged in production
- Links expire with actor tokens (1000 days currently)

## Future Enhancements

### Potential Improvements
1. **Tracking & Analytics**
   - Add database table for reminder history
   - Track open rates and click-through rates
   - Generate reminder effectiveness reports

2. **Smart Scheduling**
   - Skip weekends/holidays
   - Adjust frequency based on policy urgency
   - Time zone awareness per actor

3. **Additional Cron Jobs**
   - Policy expiration warnings (30, 15, 7 days)
   - Payment reminders for pending payments
   - Investigation SLA tracking
   - Contract renewal notifications

4. **Message Customization**
   - Templates based on actor type
   - Language preferences (Spanish/English)
   - Escalation messaging for long-pending actors

## Troubleshooting

### Common Issues

#### Emails Not Sending
1. Check email provider configuration in `.env`
2. Verify API keys are valid
3. Check email provider dashboard for bounces/blocks

#### Cron Not Running
1. Verify `vercel.json` configuration
2. Check CRON_SECRET is set in Vercel environment
3. Review Vercel Functions logs for errors

#### Test Endpoint 403 Error
- Endpoint only works in development
- Set `NODE_ENV=development` locally

## Deployment Checklist

- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Configure email provider (Resend/Mailgun/SMTP)
- [ ] Verify `vercel.json` includes cron configuration
- [ ] Test email delivery to real addresses
- [ ] Monitor first few cron executions in production
- [ ] Set up error alerting for failed cron runs

## Recent Updates (November 2025)

### Fixes Applied
1. **Database Relations** - Fixed iteration through plural relations (jointObligors, avals)
2. **Primary Landlord** - Now only sends reminders to primary landlord (isPrimary flag)
3. **User Reference** - Fixed policy.createdBy instead of incorrect policy.user
4. **Type Consistency** - Uses camelCase 'jointObligor' instead of 'joint-obligor'
5. **Email Separation** - Moved templates to emailService.ts for clean separation

### Architecture Improvements
- Business logic separated from email templates
- Reusable email functions in email service
- Type-safe interfaces for email data
- Consistent error handling

## Support
For questions or issues, contact the development team or check the Vercel documentation for cron jobs: https://vercel.com/docs/cron-jobs