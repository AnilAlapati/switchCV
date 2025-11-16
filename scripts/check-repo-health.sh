#!/bin/bash
# Repository Health Check Script
# Prevents corruption by checking disk space, file system, and git integrity

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Repository Health Check"
echo "=========================="

# 1. Check disk space
echo -e "\n📊 Disk Space:"
df -h . | tail -1 | awk '{
    used = substr($5, 1, length($5)-1);
    if (used >= 95) 
        printf "'"${RED}"'❌ CRITICAL: %s used - FREE UP SPACE NOW!'"${NC}"'\n", $5;
    else if (used >= 90)
        printf "'"${YELLOW}"'⚠️  WARNING: %s used - Clean up soon!'"${NC}"'\n", $5;
    else
        printf "'"${GREEN}"'✅ OK: %s used'"${NC}"'\n", $5;
}'

# 2. Check for git lock files
echo -e "\n🔒 Git Lock Files:"
if ls .git/*.lock 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Lock files found - may indicate crashed git process${NC}"
else
    echo -e "${GREEN}✅ No lock files${NC}"
fi

# 3. Check git index integrity
echo -e "\n📝 Git Index:"
if git ls-files >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Index is readable${NC}"
else
    echo -e "${RED}❌ Index is corrupted${NC}"
fi

# 4. Check for corrupted objects
echo -e "\n🗃️  Git Objects:"
if git fsck --no-progress 2>&1 | grep -q "error:"; then
    echo -e "${RED}❌ Corrupted objects detected${NC}"
    git fsck --no-progress 2>&1 | grep "error:" | head -5
else
    echo -e "${GREEN}✅ All objects OK${NC}"
fi

# 5. Check file system errors (macOS)
echo -e "\n💾 File System:"
if [ "$(uname)" = "Darwin" ]; then
    # Check for I/O errors in system log
    if log show --predicate 'eventMessage contains "I/O error"' --last 1h 2>/dev/null | grep -q "I/O error"; then
        echo -e "${RED}❌ Recent I/O errors detected - hardware issue likely${NC}"
    else
        echo -e "${GREEN}✅ No recent I/O errors${NC}"
    fi
fi

# 6. Summary
echo -e "\n📋 Recommendations:"
DISK_USAGE=$(df . | tail -1 | awk '{print substr($5, 1, length($5)-1)}')
if [ "$DISK_USAGE" -ge 90 ]; then
    echo "  • FREE UP DISK SPACE IMMEDIATELY"
    echo "  • Run: npm cache clean --force"
    echo "  • Run: rm -rf node_modules && npm install"
    echo "  • Clear browser cache and downloads"
fi

if ls .git/*.lock 2>/dev/null; then
    echo "  • Remove lock files: rm -f .git/*.lock"
fi

echo -e "\n✅ Health check complete"
