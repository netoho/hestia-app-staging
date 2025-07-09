# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub or create an account
4. Click "New Project"
5. Fill in your project details:
   - **Organization**: Choose or create one
   - **Name**: `hestia-app` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest region to your users
6. Click "Create new project"

## 2. Get Your Database Connection String

1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Copy the **URI** connection string
4. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

## 3. Update Your Environment Variables

Update your `.env` file:

```env
# Replace with your actual Supabase database URL
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# JWT Secret (change this in production!)
JWT_SECRET="your-secret-key-change-in-production"
```

**Important:** Replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]` with your actual values.

## 4. Install PostgreSQL Driver

The PostgreSQL driver should already be included, but if you need to install it:

```bash
npm install pg @types/pg
```

## 5. Push Your Schema to Supabase

```bash
# Generate Prisma client
npx prisma generate

# Push the schema to your Supabase database
npx prisma db push

# Seed the database with initial data
npm run db:seed
```

## 6. Verify the Setup

1. Go to your Supabase dashboard
2. Click on **Table Editor**
3. You should see your tables: `User`, `Policy`, `Package`
4. Check that the seed data was inserted properly

## 7. Optional: Enable Row Level Security (RLS)

For production, you might want to enable RLS:

1. Go to **Authentication** → **Policies**
2. Enable RLS for each table
3. Create policies based on your security requirements

## 8. Environment Variables for Production

For production deployment, make sure to:

1. Use environment variables for the DATABASE_URL
2. Generate a strong JWT_SECRET
3. Enable SSL in your connection string if required

## Benefits of PostgreSQL vs SQLite

✅ **Case-insensitive search** with `mode: 'insensitive'`
✅ **Better performance** for complex queries
✅ **Full-text search** capabilities
✅ **JSON column support** with proper indexing
✅ **Better concurrent access** handling
✅ **Production-ready** with built-in backups
✅ **Real-time subscriptions** (if needed later)

## Troubleshooting

### Connection Issues
- Make sure your DATABASE_URL is correct
- Check that your IP is allowed (Supabase allows all IPs by default)
- Verify your password doesn't contain special characters that need URL encoding

### Migration Issues
- If you have existing data, you might need to manually migrate it
- Use `npx prisma db reset` to start fresh (this will delete all data)

### Prisma Issues
- Run `npx prisma generate` after schema changes
- Use `npx prisma studio` to view your data in a web interface