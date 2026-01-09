#!/bin/bash
# =============================================================================
# SwitchCV Quality Watch Script
# =============================================================================
# Automatically runs quality checks whenever files change
# 
# Usage: npm run quality:watch
# 
# This script:
# - Watches TypeScript, JavaScript, and configuration files
# - Runs quality:quick on each change
# - Provides immediate feedback on errors
# - Suitable for continuous development
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=================================${NC}"
echo -e "${CYAN}  SwitchCV Quality Watch Mode${NC}"
echo -e "${CYAN}  Watching for file changes...${NC}"
echo -e "${CYAN}=================================${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Check if chokidar is installed, if not use native approach
if command -v chokidar-cli &> /dev/null; then
  # Use chokidar for more efficient watching
  chokidar "src/**/*.ts" "src/**/*.tsx" "tsconfig.json" "eslint.config.mjs" -c "npm run quality:quick" --ignore "**/*.test.ts" --ignore "**/__tests__/**"
else
  # Fallback: Use node's built-in fs.watch via npm watch
  echo -e "${YELLOW}Installing chokidar-cli for better file watching...${NC}"
  npm install --save-dev chokidar-cli > /dev/null 2>&1 || true
  
  # Now run with chokidar
  npx chokidar "src/**/*.ts" "src/**/*.tsx" "tsconfig.json" "eslint.config.mjs" -c "npm run quality:quick" --ignore "**/*.test.ts" --ignore "**/__tests__/**"
fi
