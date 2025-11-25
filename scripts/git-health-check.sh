#!/bin/bash
# Git Repository Health Check Script
# Run this before committing large changes

set -e

echo "🏥 Git Repository Health Check"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

echo "📍 Repository: $(pwd)"
echo ""

# 1. Check disk space
echo "💾 Checking disk space..."
available_space=$(df -h . | awk 'NR==2 {print $4}')
capacity=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
echo "   Available: $available_space (${capacity}% used)"

if [ "$capacity" -gt 90 ]; then
    echo -e "   ${RED}⚠️  WARNING: Disk is over 90% full! This can cause git corruption.${NC}"
    echo -e "   ${YELLOW}   Action: Free up disk space before committing.${NC}"
fi
echo ""

# 2. Check for lock files
echo "🔒 Checking for stale lock files..."
if [ -f .git/index.lock ]; then
    echo -e "   ${RED}❌ Found .git/index.lock${NC}"
    echo "   Remove with: rm .git/index.lock"
else
    echo -e "   ${GREEN}✓ No lock files found${NC}"
fi
echo ""

# 3. Check repository integrity (quick check)
echo "🔍 Running quick integrity check..."
if git fsck --no-full --no-dangling 2>&1 | grep -q "error:"; then
    echo -e "   ${RED}❌ Repository has integrity issues${NC}"
    echo "   Run full check: git fsck --full"
else
    echo -e "   ${GREEN}✓ Repository integrity OK${NC}"
fi
echo ""

# 4. Check for large files in staging
echo "📦 Checking staged files..."
staged_files=$(git diff --cached --name-only 2>/dev/null || echo "")
if [ -n "$staged_files" ]; then
    large_files=""
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
            size_mb=$((size / 1024 / 1024))
            if [ "$size_mb" -gt 5 ]; then
                large_files="${large_files}\n   - $file (${size_mb}MB)"
            fi
        fi
    done <<< "$staged_files"
    
    if [ -n "$large_files" ]; then
        echo -e "   ${YELLOW}⚠️  Large files staged:${NC}"
        echo -e "$large_files"
        echo -e "   ${YELLOW}Consider using Git LFS for large files${NC}"
    else
        echo -e "   ${GREEN}✓ No large files staged${NC}"
    fi
else
    echo "   No files staged"
fi
echo ""

# 5. Repository size
echo "📊 Repository statistics:"
git count-objects -vH | while read line; do
    echo "   $line"
done
echo ""

# 6. Check for uncommitted changes
echo "📝 Working tree status:"
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "   ${GREEN}✓ Working tree is clean${NC}"
else
    modified=$(git status --short | wc -l | tr -d ' ')
    echo -e "   ${YELLOW}⚠️  $modified file(s) modified${NC}"
fi
echo ""

# 7. Memory check (macOS specific)
echo "💻 System memory:"
if command -v vm_stat &> /dev/null; then
    free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    free_mb=$((free_pages * 4096 / 1024 / 1024))
    echo "   Free memory: ${free_mb}MB"
    if [ "$free_mb" -lt 500 ]; then
        echo -e "   ${YELLOW}⚠️  Low memory detected. Close some applications.${NC}"
    fi
fi
echo ""

# 8. Recommendations
echo "💡 Recommendations:"
echo "   • Run 'git gc' periodically to optimize repository"
echo "   • Keep disk usage below 90%"
echo "   • Use 'git add -p' for selective staging"
echo "   • Commit frequently in small batches"
echo "   • Avoid force-pushing to shared branches"
echo ""

echo -e "${GREEN}✓ Health check complete${NC}"
