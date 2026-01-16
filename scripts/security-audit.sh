#!/bin/bash

# Security Audit Script
# Runs comprehensive security checks on the codebase

set -e

echo "🔒 Running Security Audit..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ISSUES_FOUND=0

# 1. NPM Audit
echo "📦 Running npm audit..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    echo -e "${GREEN}✓ No moderate or higher vulnerabilities found${NC}"
else
    echo -e "${RED}✗ Vulnerabilities found in dependencies${NC}"
    npm audit --audit-level=moderate
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# 2. Check for secrets in code
echo "🔍 Scanning for exposed secrets..."
SECRET_PATTERNS=(
    "API_KEY"
    "SECRET_KEY"
    "PASSWORD"
    "PRIVATE_KEY"
    "firebase.*\"apiKey\""
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if git grep -i "$pattern" -- '*.ts' '*.tsx' '*.js' '*.jsx' ':!node_modules' ':!.next' > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Found potential secret pattern: $pattern${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done
echo -e "${GREEN}✓ Secret scan complete${NC}"
echo ""

# 3. Check security headers in next.config.ts
echo "🛡️ Validating security headers..."
REQUIRED_HEADERS=(
    "Strict-Transport-Security"
    "X-Content-Type-Options"
    "X-Frame-Options"
    "Content-Security-Policy"
    "Cross-Origin-Embedder-Policy"
    "Cross-Origin-Opener-Policy"
)

for header in "${REQUIRED_HEADERS[@]}"; do
    if ! grep -q "$header" next.config.ts; then
        echo -e "${RED}✗ Missing security header: $header${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done
echo -e "${GREEN}✓ Security headers configured${NC}"
echo ""

# 4. Check for unsafe patterns
echo "⚠️  Checking for unsafe code patterns..."
UNSAFE_PATTERNS=(
    "eval("
    "dangerouslySetInnerHTML"
    "\.innerHTML"
    "__html:"
)

for pattern in "${UNSAFE_PATTERNS[@]}"; do
    matches=$(git grep -n "$pattern" -- '*.ts' '*.tsx' '*.js' '*.jsx' ':!node_modules' ':!.next' ':!coverage' || true)
    if [ -n "$matches" ]; then
        echo -e "${YELLOW}⚠ Found potentially unsafe pattern: $pattern${NC}"
        echo "$matches"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done
echo ""

# 5. Check Firebase Security Rules
echo "🔥 Validating Firebase Security Rules..."
if [ -f "firestore.rules" ]; then
    # Check for allow read: if true (should be limited)
    if grep -q "allow read: if true" firestore.rules; then
        count=$(grep -c "allow read: if true" firestore.rules)
        echo -e "${YELLOW}⚠ Found $count instance(s) of unrestricted read access${NC}"
        echo "   Review these rules to ensure they're intentional"
    fi
    
    # Check for allow write: if true (should never exist)
    if grep -q "allow write: if true" firestore.rules; then
        echo -e "${RED}✗ CRITICAL: Found unrestricted write access in Firestore rules${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    echo -e "${GREEN}✓ Firestore rules validation complete${NC}"
else
    echo -e "${RED}✗ firestore.rules file not found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# 6. Check for proper error handling
echo "🚨 Checking error handling patterns..."
if git grep -n "console\.error" -- '*.ts' '*.tsx' ':!node_modules' ':!.next' ':!coverage' ':!__tests__' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Found console.error usage (consider using structured logging)${NC}"
fi
echo -e "${GREEN}✓ Error handling check complete${NC}"
echo ""

# 7. Check TypeScript strict mode
echo "📘 Checking TypeScript configuration..."
if grep -q '"strict": true' tsconfig.json; then
    echo -e "${GREEN}✓ TypeScript strict mode enabled${NC}"
else
    echo -e "${RED}✗ TypeScript strict mode not enabled${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# 8. Check for outdated dependencies
echo "📅 Checking for outdated critical dependencies..."
if command -v npm-check-updates &> /dev/null; then
    ncu -u --packageFile package.json --target minor --filter "/^(next|react|firebase)/" --jsonUpgraded > /tmp/ncu-output.json 2>/dev/null || true
    if [ -s /tmp/ncu-output.json ]; then
        echo -e "${YELLOW}⚠ Critical dependencies have available updates${NC}"
        cat /tmp/ncu-output.json
    else
        echo -e "${GREEN}✓ Critical dependencies are up to date${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npm-check-updates not installed (run: npm install -g npm-check-updates)${NC}"
fi
echo ""

# Final summary
echo "═══════════════════════════════════════"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Security audit passed with no issues${NC}"
    exit 0
else
    echo -e "${RED}❌ Security audit found $ISSUES_FOUND potential issue(s)${NC}"
    echo "Please review the warnings above and address as needed."
    exit 1
fi
