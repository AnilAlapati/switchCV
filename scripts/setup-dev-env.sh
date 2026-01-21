#!/bin/bash

# Setup Dev Environment Script
# Usage: ./scripts/setup-dev-env.sh

set -e # Exit on error

echo "🚀 Starting Dev Environment Setup..."

# 1. Check if user is logged in
echo "Checking Firebase login status..."
firebase login:ci > /dev/null 2>&1 || firebase login

# 2. Add the dev alias
echo "🔗 Linking to switchcv-dev project..."
# We use || true because it might already exist
firebase use --add switchcv-dev --alias dev || echo "Alias 'dev' might already exist, proceeding..."

# 3. Switch to dev
firebase use dev

# 4. Deploy Rules & Indexes (Fast)
echo "🛡️ Deploying Firestore Rules and Indexes..."
firebase deploy --only firestore:rules,firestore:indexes,storage



# 5. Deploy Functions (Slow)
echo "⚡ Deploying Cloud Functions (this may take a few minutes)..."
firebase deploy --only functions

# 6. Run Initialization Scripts
echo "🌱 Seeding Database..."
# We pass the project ID explicitly to ensure we don't touch prod
node scripts/init-system.js --project switchcv-dev
node scripts/seed-templates.js --project switchcv-dev

echo "✅ Setup Complete!"
echo "---------------------------------------------------"
echo "Next Steps:"
echo "1. Create a .env.dev file in the root with your new project keys."
echo "2. Ensure functions/.env.dev exists with WEBSITE_URL=http://localhost:3000"
echo "3. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add 'localhost'."
echo "4. Run 'npm run dev' to start working!"
echo "---------------------------------------------------"
