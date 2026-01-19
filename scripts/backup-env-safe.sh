#!/bin/bash
# Safe backup script - creates backups WITHOUT committing them
# Run: npm run backup:local

BACKUP_DIR=".env-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory (not committed)
mkdir -p "$BACKUP_DIR"

# Add to .gitignore if not already there
if ! grep -q "^$BACKUP_DIR/" .gitignore; then
  echo "$BACKUP_DIR/" >> .gitignore
fi

echo "📦 Creating safe local backup of env files..."

# Backup .env.local
if [ -f .env.local ]; then
  cp .env.local "$BACKUP_DIR/.env.local.${DATE}.backup"
  echo "✅ Backed up .env.local → $BACKUP_DIR/.env.local.${DATE}.backup"
fi

# Backup functions env
if [ -f functions/.env.dev ]; then
  cp functions/.env.dev "$BACKUP_DIR/functions.env.dev.${DATE}.backup"
  echo "✅ Backed up functions/.env.dev → $BACKUP_DIR/functions.env.dev.${DATE}.backup"
fi

echo ""
echo "🔒 Backups are stored locally ONLY and will NOT be committed to git"
echo "Location: $BACKUP_DIR/ (in .gitignore)"
echo ""
echo "💡 TIP: To restore:"
echo "  cp $BACKUP_DIR/.env.local.${DATE}.backup .env.local"
