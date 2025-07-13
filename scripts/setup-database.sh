#!/bin/bash

# Database setup script for Hestia App

echo "🚀 Setting up Hestia App database..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Please create one from .env.example."
    exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in your .env file"
    echo "Please add your database URL to .env file"
    exit 1
fi

echo "✅ DATABASE_URL found"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "🔄 Pushing schema to database..."
npx prisma db push

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Schema pushed successfully"
else
    echo "❌ Failed to push schema"
    exit 1
fi

# Seed the database
echo "🌱 Seeding database with initial data..."
npm run db:seed

# Check if seeding was successful
if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
else
    echo "❌ Failed to seed database"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Test credentials:"
echo "- Staff Admin: admin@hestia.com / password123"
echo "- Broker: broker@hestia.com / password123"
echo "- Tenant: tenant@hestia.com / password123"
echo "- Landlord: landlord@hestia.com / password123"
echo ""
echo "You can now start the development server:"
echo "npm run dev"
