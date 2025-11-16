#!/bin/bash
# Safe Commit Script - Prevents corruption by running checks first

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🛡️  Safe Commit Script"
echo "===================="
echo ""

# Check if in git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

# Run health check first
echo "Running pre-commit health check..."
echo ""

# Check disk space
capacity=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$capacity" -gt 90 ]; then
    echo -e "${RED}❌ ABORT: Disk is ${capacity}% full!${NC}"
    echo "Git corruption risk is HIGH with low disk space."
    echo "Free up space before committing."
    exit 1
fi

# Remove any lock files
if [ -f .git/index.lock ]; then
    echo -e "${YELLOW}⚠️  Removing stale lock file...${NC}"
    rm -f .git/index.lock
fi

# Check for staged files
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  No files staged for commit${NC}"
    echo "Stage files first: git add <files>"
    exit 1
fi

# Show what will be committed
echo -e "${GREEN}Files to be committed:${NC}"
git diff --cached --name-status | while read status file; do
    echo "   $status $file"
done
echo ""

# Get commit message
if [ -z "$1" ]; then
    echo "Enter commit message (or Ctrl+C to cancel):"
    read -r commit_message
else
    commit_message="$1"
fi

if [ -z "$commit_message" ]; then
    echo -e "${RED}❌ Commit message cannot be empty${NC}"
    exit 1
fi

# Perform the commit
echo ""
echo "Committing..."
if git commit -m "$commit_message"; then
    echo -e "${GREEN}✓ Commit successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "   git push origin $(git branch --show-current)"
else
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
fi
