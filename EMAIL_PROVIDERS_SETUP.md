# Email Providers Configuration

The application supports multiple email providers for sending policy invitations and notifications.

## Supported Providers

### 1. Resend (Default)
- Professional email service with great deliverability
- Easy to set up and configure
- Good for development and production

### 2. Mailgun
- Enterprise-grade email service
- Advanced analytics and tracking
- Good for high-volume email sending

## Configuration

### Environment Variables

Set the following variables in your `.env` file:

```bash
# Choose email provider: 'resend' or 'mailgun'
EMAIL_PROVIDER="resend"

# Resend Configuration
RESEND_API_KEY="your-resend-api-key"

# Mailgun Configuration (when using mailgun)
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-domain.mailgun.org"

# Email sender address (works with both providers)
EMAIL_FROM="noreply@yourdomain.com"
```

### Setting up Resend

1. Go to [resend.com](https://resend.com)
2. Create an account and verify your domain
3. Generate an API key
4. Set `EMAIL_PROVIDER="resend"` and `RESEND_API_KEY="your-key"`

### Setting up Mailgun

1. Go to [mailgun.com](https://mailgun.com)
2. Create an account and add your domain
3. Get your API key and domain from the dashboard
4. Set `EMAIL_PROVIDER="mailgun"`, `MAILGUN_API_KEY="your-key"`, and `MAILGUN_DOMAIN="your-domain"`

## Switching Providers

To switch between providers, simply change the `EMAIL_PROVIDER` environment variable:

- `EMAIL_PROVIDER="resend"` - Uses Resend
- `EMAIL_PROVIDER="mailgun"` - Uses Mailgun

The application will automatically route emails through the selected provider.

## Testing

Both providers work seamlessly with the existing email templates:
- Policy invitations
- Submission confirmations  
- Status updates

## Development Mode

When running with Firebase emulator (`FIREBASE_EMULATOR_HOST` set), emails are mocked and logged to console instead of being sent.