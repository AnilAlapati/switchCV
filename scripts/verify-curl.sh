#!/bin/bash

# Define Keys (Exposed in backup files)
FIREBASE_DEV="AIzaSyAduU_bS8-Vzq-90LuR5stn5PuBleyMQNs"
FIREBASE_PROD="AIzaSyAvB2MtJ-uw3ZcW66TeIYkUBL6vkQSlBik"
OPENAI="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"
GEMINI="AIzaSyCFolcXJMMq-oGfjuv0qsrAg2EVBKc5KuY"
GROQ="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"
HF="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"

echo "---------------------------------------------------"
echo "🔍 VERIFICATION VIA CURL (Raw Output)"
echo "---------------------------------------------------"

echo ""
echo "xy 1. Testing Firebase Dev Key..."
echo "curl -s -o /dev/null -w \"%{http_code}\" -X POST \"https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=$FIREBASE_DEV\" -H \"Content-Type: application/json\" -d '{\"identifier\":\"test@example.com\",\"continueUri\":\"http://localhost\"}'"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=$FIREBASE_DEV" -H "Content-Type: application/json" -d '{"identifier":"test@example.com","continueUri":"http://localhost"}')
if [ "$CODE" == "200" ]; then echo "✅ ACTIVE (200)"; else echo "❌ INACTIVE/ERROR ($CODE)"; fi

echo ""
echo "xy 2. Testing Firebase Prod Key (Referrer Restricted)..."
# We add a Fake Referer to see if that's the only BLOCKER, or if it works without it (it shouldn't)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=$FIREBASE_PROD" -H "Content-Type: application/json" -d '{"identifier":"test@example.com","continueUri":"http://localhost"}')
if [ "$CODE" == "200" ]; then echo "✅ ACTIVE (200)"; else echo "🔒 BLOCKED/RESTRICTED ($CODE)"; fi

echo ""
echo "xy 3. Testing OpenAI Key..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.openai.com/v1/models" -H "Authorization: Bearer $OPENAI")
if [ "$CODE" == "200" ]; then echo "✅ ACTIVE (200)"; else echo "❌ INVALID ($CODE)"; fi

echo ""
echo "xy 4. Testing Groq Key..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.groq.com/openai/v1/models" -H "Authorization: Bearer $GROQ")
if [ "$CODE" == "200" ]; then echo "✅ ACTIVE (200)"; else echo "❌ INVALID ($CODE)"; fi

echo ""
echo "xy 5. Testing Hugging Face Token..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://huggingface.co/api/whoami-v2" -H "Authorization: Bearer $HF")
if [ "$CODE" == "200" ]; then echo "✅ ACTIVE (200)"; else echo "❌ INVALID ($CODE)"; fi

echo ""
echo "xy 6. Testing Gemini Key..."
# Trying a list models endpoint that usually works for any valid key
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI")
if [ "$CODE" == "200" ]; then echo "✅ ACTIVE (200)"; else echo "❌ INVALID ($CODE)"; fi
