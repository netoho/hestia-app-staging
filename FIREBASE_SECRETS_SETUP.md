# Firebase App Hosting Secrets Setup

## Overview
Firebase App Hosting uses Google Secret Manager to securely store sensitive configuration values. Never commit actual secret values to your repository.

## Setting Up Secrets

### 1. Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project initialized
- Google Cloud project linked to Firebase

### 2. Create Secrets in Google Secret Manager

Using Firebase CLI:
```bash
# Login to Firebase
firebase login

# Set the DATABASE_URL secret
firebase apphosting:secrets:set DATABASE_URL
# When prompted, enter: postgresql://postgres.dscpjypjpihuxuzouuge:IzIBcB9G8WzEfjU@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Set the JWT_SECRET
firebase apphosting:secrets:set JWT_SECRET
# When prompted, enter your JWT secret (e.g., a strong random string)
```

Alternatively, using Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Security > Secret Manager
3. Click "Create Secret"
4. Create secrets with these names:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Your JWT signing secret

### 3. Verify Configuration
The `apphosting.yaml` file should reference secret names, not values:
```yaml
runConfig:
  env:
    - variable: DATABASE_URL
      secret: DATABASE_URL
    - variable: JWT_SECRET
      secret: JWT_SECRET
```

### 4. Deploy
```bash
firebase apphosting:deploy
```

## Security Best Practices
1. **Never commit secrets**: Always use Secret Manager references
2. **Use strong secrets**: Generate cryptographically secure random strings for JWT_SECRET
3. **Rotate secrets regularly**: Update secrets periodically
4. **Limit access**: Use IAM to control who can access secrets
5. **Different secrets per environment**: Use different values for dev/staging/production

## Local Development
For local development, use a `.env.local` file (already in .gitignore):
```env
DATABASE_URL=postgresql://postgres.dscpjypjpihuxuzouuge:IzIBcB9G8WzEfjU@aws-0-us-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=your-development-secret
```

## Troubleshooting
- If deployment fails with secret errors, ensure secrets exist in Secret Manager
- Check that the service account has "Secret Manager Secret Accessor" role
- Verify secret names match exactly (case-sensitive)