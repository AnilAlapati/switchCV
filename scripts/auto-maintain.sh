#!/bin/bash
# Automatic Maintenance Script - Runs in background
# This prevents issues before they happen

set -e

echo "🔧 Running automatic maintenance..."

# 1. Auto-clean npm cache if disk > 90%
DISK_USAGE=$(df . | tail -1 | awk '{print substr($5, 1, length($5)-1)}')
if [ "$DISK_USAGE" -ge 90 ]; then
    echo "  • Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
fi

# 2. Clean Next.js build cache
if [ -d ".next/cache" ]; then
    echo "  • Cleaning Next.js cache..."
    rm -rf .next/cache
fi

# 3. Clean node_modules cache
if [ -d "node_modules/.cache" ]; then
    echo "  • Cleaning node_modules cache..."
    rm -rf node_modules/.cache
fi

# 4. Remove git lock files
if ls .git/*.lock 2>/dev/null; then
    echo "  • Removing stale git locks..."
    rm -f .git/*.lock
fi

# 5. Optimize git repository
echo "  • Optimizing git repository..."
git gc --auto --quiet 2>/dev/null || true

# 6. Check for corrupted objects
if ! git fsck --quick --quiet 2>/dev/null; then
    echo "  ⚠️  Git corruption detected. Running recovery..."
    git fsck --full 2>&1 | grep "missing" | awk '{print $3}' | while read obj; do
        rm -f ".git/objects/${obj:0:2}/${obj:2}" 2>/dev/null || true
    done
    git fetch --all 2>/dev/null || true
fi

echo "✅ Maintenance complete"

# Show current status
DISK_USAGE=$(df . | tail -1 | awk '{print $5}')
echo "📊 Disk usage: $DISK_USAGE"
