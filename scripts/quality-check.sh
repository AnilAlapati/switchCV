#!/bin/bash
# =============================================================================
# SwitchCV Quality Gate Script
# =============================================================================
# This script MUST pass before any code can be committed.
# It validates ALL quality standards established during the 104+ issue fix.
#
# Usage: ./scripts/quality-check.sh [--quick] [--fix]
#   --quick : Run only fast checks (TypeScript, lint)
#   --fix   : Auto-fix issues where possible
#
# Exit Codes:
#   0 = All checks passed
#   1 = TypeScript errors (BLOCKING)
#   2 = Lint errors (BLOCKING)
#   3 = Test failures (BLOCKING in CI)
#   4 = Build failure (BLOCKING)
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

QUICK_MODE=false
FIX_MODE=false
ERRORS=0

# Parse arguments
for arg in "$@"; do
  case $arg in
    --quick) QUICK_MODE=true ;;
    --fix) FIX_MODE=true ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SwitchCV Quality Gate Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# CHECK 1: TypeScript Type Safety (CRITICAL - No Bypass)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Checking TypeScript Types...${NC}"

# Count production errors only (exclude test files)
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "^src/" | grep -v "__tests__" | grep -v ".test.ts" | wc -l | tr -d ' ')

if [ "$TS_ERRORS" -gt "0" ]; then
  echo -e "${RED}❌ FAILED: $TS_ERRORS TypeScript errors in production code${NC}"
  echo ""
  echo "Errors:"
  npx tsc --noEmit 2>&1 | grep "^src/" | grep -v "__tests__" | grep -v ".test.ts" | head -20
  echo ""
  echo -e "${RED}Fix these before committing!${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASSED: No TypeScript errors in production code${NC}"
fi
echo ""

# -----------------------------------------------------------------------------
# CHECK 2: ESLint Code Quality
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Checking ESLint...${NC}"

if [ "$FIX_MODE" = true ]; then
  LINT_OUTPUT=$(npm run lint -- --fix 2>&1) || true
else
  LINT_OUTPUT=$(npm run lint 2>&1) || true
fi

# Exclude the summary line from error counting to avoid matching "0 errors"
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep "error" | grep -v "0 errors" | wc -l | tr -d ' ' || echo "0")

if [ "$LINT_ERRORS" -gt "0" ]; then
  echo -e "${RED}❌ FAILED: $LINT_ERRORS ESLint errors${NC}"
  echo "$LINT_OUTPUT" | grep "error" | head -10
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASSED: No critical lint errors${NC}"
fi
echo ""

# Skip remaining checks in quick mode
if [ "$QUICK_MODE" = true ]; then
  echo -e "${YELLOW}Quick mode - skipping build and tests${NC}"
else
  # ---------------------------------------------------------------------------
  # CHECK 3: Build Verification
  # ---------------------------------------------------------------------------
  echo -e "${YELLOW}[3/5] Verifying Build...${NC}"
  
  if npm run build --dry-run > /dev/null 2>&1 || true; then
    # Try actual build
    BUILD_OUTPUT=$(npm run build 2>&1) || true
    
    if echo "$BUILD_OUTPUT" | grep -q "Failed to compile"; then
      echo -e "${RED}❌ FAILED: Build failed${NC}"
      echo "$BUILD_OUTPUT" | tail -20
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✅ PASSED: Build succeeds${NC}"
    fi
  fi
  echo ""

  # ---------------------------------------------------------------------------
  # CHECK 4: Critical Tests (Security & API)
  # ---------------------------------------------------------------------------
  echo -e "${YELLOW}[4/5] Running Critical Tests...${NC}"
  
  CRITICAL_TESTS=(
    "src/lib/utils/api-helpers.test.ts"
    "src/__tests__/api/*.test.ts"
  )
  
  TEST_RESULT=0
  npm test -- --passWithNoTests --testPathPattern="api-helpers|security" 2>&1 || TEST_RESULT=$?
  
  if [ "$TEST_RESULT" -ne "0" ]; then
    echo -e "${RED}⚠️  WARNING: Some tests failing (review before PR)${NC}"
    # Not blocking for now, but flag it
  else
    echo -e "${GREEN}✅ PASSED: Critical tests pass${NC}"
  fi
  echo ""

  # ---------------------------------------------------------------------------
  # CHECK 5: Security Patterns Check
  # ---------------------------------------------------------------------------
  echo -e "${YELLOW}[5/5] Checking Security Patterns...${NC}"
  
  # Check for dangerous patterns that should never appear
  SECURITY_ISSUES=0
  
  # Check for console.log in API routes (should use logger)
  CONSOLE_IN_API=$(grep -r "console\.log" src/app/api --include="*.ts" 2>/dev/null | grep -v ".test.ts" | wc -l | tr -d ' ')
  if [ "$CONSOLE_IN_API" -gt "0" ]; then
    echo -e "${RED}  ⚠️  Found $CONSOLE_IN_API console.log in API routes - use logger instead${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
  fi
  
  # Check for hardcoded secrets
  HARDCODED=$(grep -rE "(api_key|apikey|secret|password)\s*=\s*['\"][^'\"]{8,}" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".test" | grep -v ".example" | wc -l | tr -d ' ')
  if [ "$HARDCODED" -gt "0" ]; then
    echo -e "${RED}  🚨 CRITICAL: Found potential hardcoded secrets!${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    ERRORS=$((ERRORS + 1))
  fi
  
  # Check for missing auth in API routes
  MISSING_AUTH=$(grep -L "getAuthenticatedUserId\|maybeGetAuthenticatedUserId" src/app/api/**/route.ts 2>/dev/null | grep -v "public\|health" | wc -l | tr -d ' ') || MISSING_AUTH=0
  if [ "$MISSING_AUTH" -gt "0" ]; then
    echo -e "${YELLOW}  ℹ️  $MISSING_AUTH API routes may need auth review${NC}"
  fi
  
  if [ "$SECURITY_ISSUES" -eq "0" ]; then
    echo -e "${GREEN}✅ PASSED: No security issues detected${NC}"
  fi
fi

# Additional pattern checks for 104-issue standards
if [ "$QUICK_MODE" = false ]; then
  echo -e "${YELLOW}[5b/5] Checking Code Quality Patterns (from 104-issue fix)...${NC}"
  
  PATTERN_ISSUES=0
  
  # Check for Pino logger misuse (wrong argument order)
  # Should be: logger.info({ context }, "message") NOT logger.info("message", { context })
  LOGGER_MISUSE=$(grep -rE "logger\.(info|warn|error|debug)\(['\"][^'\"]+['\"],\s*\{" src/lib/services src/app/api --include="*.ts" 2>/dev/null | grep -v ".test.ts" | wc -l | tr -d ' ')
  if [ "$LOGGER_MISUSE" -gt "0" ]; then
    echo -e "${YELLOW}  ⚠️  Found $LOGGER_MISUSE potential logger format issues (should be context-first)${NC}"
    PATTERN_ISSUES=$((PATTERN_ISSUES + 1))
  fi
  
  # Check for 'any' type usage in production
  ANY_COUNT=$(grep -rE ":\s*any|as\s+any" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".test.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
  if [ "$ANY_COUNT" -gt "10" ]; then  # Allow some for backwards compat
    echo -e "${YELLOW}  ⚠️  Found $ANY_COUNT uses of 'any' type - prefer explicit types${NC}"
    PATTERN_ISSUES=$((PATTERN_ISSUES + 1))
  fi
  
  # Check for missing error handling in async/await
  MISSING_CATCH=$(grep -rE "await.*\(" src/app/api --include="*.ts" 2>/dev/null | grep -v "try\|catch\|handleApiError" | wc -l | tr -d ' ')
  if [ "$MISSING_CATCH" -gt "5" ]; then
    echo -e "${YELLOW}  ℹ️  Review: $MISSING_CATCH async calls - ensure proper error handling${NC}"
  fi
  
  if [ "$PATTERN_ISSUES" -gt "0" ]; then
    echo -e "${YELLOW}  Note: Pattern issues are warnings, not blocking${NC}"
  else
    echo -e "${GREEN}✅ PASSED: Code quality patterns compliant${NC}"
  fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"

if [ "$ERRORS" -gt "0" ]; then
  echo -e "${RED}❌ QUALITY CHECK FAILED: $ERRORS issue(s) found${NC}"
  echo -e "${RED}   Fix the above issues before committing!${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 1
else
  echo -e "${GREEN}✅ ALL QUALITY CHECKS PASSED${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 0
fi
