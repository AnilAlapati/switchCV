#!/bin/bash
# Lightweight workspace maintenance utility.

set -euo pipefail

print_usage() {
    cat <<'EOF'
Usage: ./scripts/auto-maintain.sh [--git-maintenance]

Runs safe cache clean-up steps. Pass --git-maintenance to opt in to non-destructive git gc.
EOF
}

RUN_GIT_MAINTENANCE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --git-maintenance)
            RUN_GIT_MAINTENANCE=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            print_usage
            exit 1
            ;;
    esac
done

echo "🔧 Running workspace maintenance..."

DISK_USAGE=$(df . | tail -1 | awk '{print substr($5, 1, length($5)-1)}')
if [ "$DISK_USAGE" -ge 90 ]; then
    echo "  • Disk usage at ${DISK_USAGE}%. Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
fi

if [ -d ".next/cache" ]; then
    echo "  • Removing Next.js cache"
    rm -rf .next/cache
fi

if [ -d "node_modules/.cache" ]; then
    echo "  • Removing node_modules cache"
    rm -rf node_modules/.cache
fi

if compgen -G ".git/*.lock" > /dev/null; then
    echo "  • Clearing stale git lock files"
    rm -f .git/*.lock
fi

if $RUN_GIT_MAINTENANCE; then
    echo "  • Running git gc --auto (opt-in)"
    git gc --auto --quiet 2>/dev/null || true
else
    echo "  • Skipping git maintenance (use --git-maintenance to opt in)"
fi

FINAL_USAGE=$(df . | tail -1 | awk '{print $5}')
echo "✅ Maintenance complete (disk usage: $FINAL_USAGE)"
