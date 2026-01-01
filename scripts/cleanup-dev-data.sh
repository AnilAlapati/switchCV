#!/bin/bash
# Cleanup script for development data
# This script safely deletes all users and their data from the dev environment

set -e

PROJECT_ID="switchcv-dev"
echo "⚠️  Starting cleanup for project: $PROJECT_ID"
echo ""
echo "This will delete:"
echo "  - All users from Firebase Authentication"
echo "  - All user documents from Firestore"
echo "  - All resumes and resume profiles"
echo "  - All verification tokens"
echo "  - All access requests, audit logs, etc."
echo ""
read -p "Continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Exporting users from Firebase Auth..."
firebase auth:export all_users.json --project "$PROJECT_ID" 2>/dev/null || true

# Count users
USER_COUNT=$(cat all_users.json 2>/dev/null | grep -c '"email"' || echo "0")
echo "Found $USER_COUNT users to delete"

if [ "$USER_COUNT" -gt 0 ]; then
    echo ""
    echo "Step 2: Deleting users from Firebase Authentication..."
    # Extract UIDs and delete each user
    cat all_users.json | jq -r '.users[].localId' | while read USER_ID; do
        if [ -n "$USER_ID" ]; then
            echo "  Deleting user: $USER_ID"
            firebase auth:delete "$USER_ID" --project "$PROJECT_ID" 2>/dev/null || true
        fi
    done
    echo "✅ Users deleted from Firebase Auth"
else
    echo "ℹ️  No users found in Firebase Auth"
fi

echo ""
echo "Step 3: Deleting Firestore collections..."

# Function to delete all documents in a collection
delete_collection() {
    local COLLECTION=$1
    echo "  Deleting collection: $COLLECTION"
    firebase firestore:delete --recursive "$COLLECTION" --project "$PROJECT_ID" --yes 2>/dev/null || true
}

# Delete all user-related collections
delete_collection "users"
delete_collection "userProfiles"
delete_collection "resumes"
delete_collection "resumeProfiles"
delete_collection "verificationTokens"
delete_collection "accessRequests"
delete_collection "recruiterRequests"
delete_collection "auditLogs"
delete_collection "systemConfig"
delete_collection "mail"
delete_collection "mailDeliveryLog"

echo "✅ Firestore data deleted"

echo ""
echo "Step 4: Verification"
echo "  Remaining Auth users:"
firebase auth:list --project "$PROJECT_ID" 2>/dev/null | head -5 || echo "    (none or error checking)"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Create new test account to verify email flow works"
echo "  3. Check Gmail for verification email with custom token link"
echo ""
