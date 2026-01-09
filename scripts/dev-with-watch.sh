#!/bin/bash
# =============================================================================
# SwitchCV Development Setup with Automatic Quality Checking
# =============================================================================
# 
# This script starts the development environment with:
# 1. Dev server (localhost:3000)
# 2. Automatic quality checks (watch mode)
# 
# Both run in parallel for a smooth development experience.
# 
# Usage: npm run dev:watch
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure we have secrets set up
bash scripts/dev-with-secrets.sh

echo ""
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}  SwitchCV Development with Quality Checking${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo -e "${GREEN}✅ Starting in parallel:${NC}"
echo -e "   1️⃣  Dev server (http://localhost:3000)"
echo -e "   2️⃣  Quality watch (automatic checks on code changes)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both${NC}"
echo ""

# Function to kill both processes on Ctrl+C
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping dev server and quality watch...${NC}"
  kill %1 2>/dev/null || true
  kill %2 2>/dev/null || true
  wait
  echo -e "${GREEN}✅ Both processes stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start dev server in background
echo -e "${BLUE}[DEV SERVER]${NC} Starting..."
next dev &
DEV_PID=$!

# Give dev server a moment to start
sleep 2

# Start quality watch in background
echo -e "${BLUE}[QUALITY WATCH]${NC} Starting..."
bash scripts/watch-quality.sh &
WATCH_PID=$!

echo ""
echo -e "${GREEN}✅ Both processes running!${NC}"
echo -e "${BLUE}[DEV SERVER]${NC} http://localhost:3000"
echo ""

# Wait for both processes
wait
