#!/bin/bash
# ONE-TIME SETUP SCRIPT - Run this once to enable automatic protection

echo "🚀 Setting up automatic protection for SwitchCV..."

# 1. Install husky if not already installed
if ! command -v husky &> /dev/null; then
    echo "  • Installing husky..."
    npm install husky --save-dev
fi

# 2. Initialize husky
echo "  • Initializing git hooks..."
npx husky install

# 3. Make all scripts executable
echo "  • Setting permissions..."
chmod +x scripts/*.sh
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# 4. Set git config for better handling
echo "  • Configuring git for safety..."
git config core.fsyncobjectfiles true
git config core.preloadindex true
git config core.fscache true

# 5. Run initial cleanup
echo "  • Running initial cleanup..."
./scripts/auto-maintain.sh

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "🎉 Your repository is now AUTOMATICALLY protected!"
echo ""
echo "What happens now:"
echo "  ✓ Before every commit: Auto health check + cleanup"
echo "  ✓ Before every push: Safety verification"
echo "  ✓ Daily: GitHub Actions cleanup"
echo "  ✓ Auto-remove: Lock files"
echo "  ✓ Auto-clean: Cache when disk is full"
echo ""
echo "You can also manually run:"
echo "  • npm run cleanup       - Manual cleanup"
echo "  • npm run health-check  - Manual health check"
echo ""
echo "🔒 You're protected from corruption now!"
