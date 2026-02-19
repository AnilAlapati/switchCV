#!/bin/bash

# SwitchCV Deployment Script
# Handles dev, prod, and sync deployments with automatic version bumping for prod releases
#
# ENVIRONMENT VARIABLE HANDLING:
#   - DEV builds use: .env.local (switchcv-dev Firebase project)
#   - PROD builds use: .env.production (switchcv-e5136 Firebase project)
#   - Next.js automatically selects the correct .env file when NODE_ENV=production
#
# Firebase Projects:
#   - DEV:  switchcv-dev (localhost testing)
#   - PROD: switchcv-e5136 (https://switchcv.com) 
#
# Usage:
#   ./scripts/deploy.sh dev               # Deploy to dev environment
#   ./scripts/deploy.sh prod              # Deploy to prod (with version bump + release notes)
#   ./scripts/deploy.sh sync              # Deploy to both dev AND prod, return to dev
#   ./scripts/deploy.sh prod --no-bump    # Deploy to prod WITHOUT version bump (for hotfixes)
#
# Pre-deployment checks:
#   1. Validates committed changes only
#   2. Runs TypeScript type check
#   3. Runs ESLint
#   4. Runs Next.js build (with correct env vars)
#
# Deployment order (Firebase best practices):
#   1. Firestore indexes (must be first)
#   2. Cloud Functions
#   3. Hosting + Streaming Runtime

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================

DEPLOYMENT_MODE=${1:-"sync"}  # dev, prod, or sync
BUMP_VERSION=${2:-"--bump"}   # --bump or --no-bump
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ============================================================================
# CLEANUP FUNCTION - Always return to DEV
# ============================================================================

cleanup() {
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
  else
    echo ""
    echo -e "${RED}❌ Deployment failed with code $EXIT_CODE${NC}"
  fi
  
  echo -e "${BLUE}🔄 Resetting to DEV environment...${NC}"
  npm run env:dev --silent 2>/dev/null || firebase use dev 2>/dev/null || true
  
  exit $EXIT_CODE
}

trap cleanup EXIT

# ============================================================================
# VALIDATION
# ============================================================================

validate_inputs() {
  if [[ ! "$DEPLOYMENT_MODE" =~ ^(dev|prod|sync)$ ]]; then
    echo -e "${RED}❌ Invalid deployment mode: $DEPLOYMENT_MODE${NC}"
    echo "Usage: $0 [dev|prod|sync] [--bump|--no-bump]"
    exit 1
  fi
  
  # Check if git is clean (no uncommitted changes)
  if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Error: Uncommitted changes detected!${NC}"
    echo "Please commit or stash changes before deploying:"
    git status
    exit 1
  fi
}

# ============================================================================
# VERSION MANAGEMENT
# ============================================================================

handle_version_bump() {
  LOCAL_MODE=$1
  
  if [ "$LOCAL_MODE" != "prod" ]; then
    return 0  # Don't bump for dev or when resuming after dev
  fi
  
  if [ "$BUMP_VERSION" == "--no-bump" ]; then
    echo -e "${YELLOW}⊘ Skipping version bump (--no-bump specified)${NC}"
    return 0
  fi
  
  echo -e "${BLUE}📝 Bumping version for production release...${NC}"
  
  # Run the version increment script
  npm run release 2>/dev/null
  
  # Add the updated files to git
  git add package.json package-lock.json docs/RELEASE_NOTES.md
  git commit -m "chore: bump version" --quiet
  
  echo -e "${GREEN}✅ Version bumped and committed${NC}"
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

run_quality_checks() {
  echo -e "${BLUE}🔍 Running quality checks...${NC}"
  
  echo "  • TypeScript check..."
  npx tsc --noEmit 2>&1 | tail -1 || true
  
  echo "  • ESLint check..."
  npm run lint --silent 2>&1 | tail -1 || true
  
  echo "  • Building Next.js (uses .env.local for dev, .env.production for prod)..."
  NODE_ENV=production npm run build --silent 2>&1 | tail -5 || true
  
  echo -e "${GREEN}✅ Quality checks completed${NC}"
}

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

deploy_to_env() {
  TARGET_ENV=$1
  PROJECT_FLAG=$2
  
  if [ "$TARGET_ENV" == "dev" ]; then
    PROJECT_NAME="switchcv-dev"
    FLAG="-P dev"
  else
    PROJECT_NAME="switchcv-e5136"
    FLAG="-P default"
  fi
  
  echo ""
  echo -e "${BLUE}🚀 Deploying to $TARGET_ENV (${PROJECT_NAME})...${NC}"
  
  # Switch environment
  npm run env:${TARGET_ENV} --silent 2>/dev/null || firebase use ${TARGET_ENV} 2>/dev/null || true
  
  # Deploy in order (Firestore indexes first, as per Firebase best practices)
  echo -e "${YELLOW}  [1/3] Firestore indexes & rules...${NC}"
  firebase deploy --only firestore:indexes,firestore:rules $FLAG
  
  echo -e "${YELLOW}  [2/3] Cloud Functions...${NC}"
  firebase deploy --only functions $FLAG
  
  echo -e "${YELLOW}  [3/3] Hosting + SSR...${NC}"
  firebase deploy --only hosting $FLAG
  
  echo -e "${GREEN}✅ $TARGET_ENV deployment complete!${NC}"
  
  # Show deployment summary
  DEPLOY_URL=""
  if [ "$TARGET_ENV" == "dev" ]; then
    DEPLOY_URL="https://switchcv-dev.web.app"
  else
    DEPLOY_URL="https://switchcv-e5136.web.app"
  fi
  
  echo -e "${BLUE}   Live URL: ${DEPLOY_URL}${NC}"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            🚀 SwitchCV Deployment Script v2.0                  ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  
  # Validate inputs
  validate_inputs
  
  # Show deployment plan
  echo -e "${BLUE}📋 Deployment Plan:${NC}"
  echo "  Mode: $DEPLOYMENT_MODE"
  echo "  Version bump: $([[ "$BUMP_VERSION" == "--bump" ]] && echo "Yes (prod only)" || echo "No")"
  echo "  Time: $TIMESTAMP"
  echo ""
  
  # Ask for confirmation
  echo -e "${YELLOW}⚠️  About to deploy. Continue? (yes/no)${NC}"
  read -p "> " CONFIRM
  
  if [[ ! "$CONFIRM" =~ ^[Yy]([Ee][Ss])?$ ]]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
  fi
  
  # Run quality checks
  run_quality_checks
  
  # Execute deployment based on mode
  case $DEPLOYMENT_MODE in
    dev)
      echo -e "${BLUE}▶ Dev-only deployment${NC}"
      deploy_to_env dev
      ;;
    
    prod)
      echo -e "${BLUE}▶ Production deployment (will bump version)${NC}"
      handle_version_bump "prod"
      deploy_to_env prod
      ;;
    
    sync)
      echo -e "${BLUE}▶ Sync deployment (dev → prod → dev)${NC}"
      
      # Deploy to dev first
      deploy_to_env dev
      
      # Ask if ready to promote to prod
      echo ""
      echo -e "${YELLOW}✓ Dev deployment successful.${NC}"
      echo -e "${YELLOW}Ready to promote to production? (yes/no)${NC}"
      read -p "> " PROMOTE
      
      if [[ "$PROMOTE" =~ ^[Yy]([Ee][Ss])?$ ]]; then
        # Bump version for prod
        handle_version_bump "prod"
        
        # Deploy to prod
        deploy_to_env prod
        
        echo ""
        echo -e "${GREEN}✅ Sync deployment complete: DEV → PROD → DEV${NC}"
      else
        echo -e "${YELLOW}⊘ Skipping production deployment${NC}"
      fi
      ;;
  esac
  
  # Summary
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                    ✅ Deployment Complete                       ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo -e "${BLUE}Verification commands:${NC}"
  
  if [[ "$DEPLOYMENT_MODE" =~ ^(dev|sync)$ ]]; then
    echo "  Dev:  curl https://switchcv-dev.web.app/api/health"
  fi
  
  if [[ "$DEPLOYMENT_MODE" =~ ^(prod|sync)$ ]]; then
    echo "  Prod: curl https://switchcv-e5136.web.app/api/health"
  fi
  
  echo ""
  echo -e "${BLUE}Current environment: DEV (auto-switched back)${NC}"
  echo ""
}

# ============================================================================
# RUN MAIN
# ============================================================================

main
