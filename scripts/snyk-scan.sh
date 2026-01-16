#!/bin/bash

# Snyk Security Scanner - CLI Automation
# Scans for vulnerabilities and code issues across all projects

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Snyk Security Scanner (CLI)       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check if Snyk is authenticated
if ! npx snyk auth --check &>/dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with Snyk${NC}"
    echo "Run: npx snyk auth"
    exit 1
fi

REPORT_DIR="snyk-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create reports directory
mkdir -p "$REPORT_DIR"

# Parse command line arguments
SCAN_TYPE=${1:-"all"}
UPLOAD=${2:-"no"}

echo -e "${GREEN}📋 Scan Configuration:${NC}"
echo "  Type: $SCAN_TYPE"
echo "  Upload to Snyk: $UPLOAD"
echo ""

# Function to run dependency scan
run_dependency_scan() {
    echo -e "${BLUE}┌─────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  1. Dependency Vulnerability Scan   │${NC}"
    echo -e "${BLUE}└─────────────────────────────────────┘${NC}"
    
    echo "Scanning all package.json files..."
    if npx snyk test --all-projects --severity-threshold=low; then
        echo -e "${GREEN}✅ No dependency vulnerabilities found!${NC}"
    else
        echo -e "${YELLOW}⚠️  Vulnerabilities detected - see output above${NC}"
    fi
    
    # Save JSON report
    npx snyk test --all-projects --json > "$REPORT_DIR/dependencies_$TIMESTAMP.json" 2>/dev/null || true
    echo -e "📄 Report saved: $REPORT_DIR/dependencies_$TIMESTAMP.json"
    echo ""
}

# Function to run code analysis
run_code_scan() {
    echo -e "${BLUE}┌─────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  2. Code Security Analysis          │${NC}"
    echo -e "${BLUE}└─────────────────────────────────────┘${NC}"
    
    echo "Scanning for code security issues..."
    if npx snyk code test; then
        echo -e "${GREEN}✅ No code security issues found!${NC}"
    else
        echo -e "${YELLOW}⚠️  Code issues detected - see output above${NC}"
    fi
    
    # Save JSON report
    npx snyk code test --json > "$REPORT_DIR/code_$TIMESTAMP.json" 2>/dev/null || true
    echo -e "📄 Report saved: $REPORT_DIR/code_$TIMESTAMP.json"
    echo ""
}

# Function to run production-only scan
run_production_scan() {
    echo -e "${BLUE}┌─────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  3. Production Dependencies Only    │${NC}"
    echo -e "${BLUE}└─────────────────────────────────────┘${NC}"
    
    echo "Scanning production dependencies..."
    npm audit --production
    echo ""
}

# Function to upload results
upload_results() {
    echo -e "${BLUE}┌─────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  4. Upload to Snyk Dashboard        │${NC}"
    echo -e "${BLUE}└─────────────────────────────────────┘${NC}"
    
    echo "Uploading scan results to Snyk..."
    npx snyk monitor --all-projects --target-reference=$(git branch --show-current)
    echo -e "${GREEN}✅ Results uploaded to Snyk dashboard${NC}"
    echo ""
}

# Main execution
case "$SCAN_TYPE" in
    "deps"|"dependencies")
        run_dependency_scan
        ;;
    "code")
        run_code_scan
        ;;
    "prod"|"production")
        run_production_scan
        ;;
    "all")
        run_dependency_scan
        run_code_scan
        run_production_scan
        ;;
    *)
        echo -e "${RED}❌ Unknown scan type: $SCAN_TYPE${NC}"
        echo "Usage: $0 [all|deps|code|prod] [upload]"
        exit 1
        ;;
esac

# Upload if requested
if [ "$UPLOAD" = "upload" ] || [ "$UPLOAD" = "yes" ]; then
    upload_results
fi

# Summary
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Security Scan Complete! 🎉          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Reports saved in: $REPORT_DIR/"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  • Review issues above"
echo "  • Check reports: ls -lh $REPORT_DIR/"
echo "  • Upload results: $0 all upload"
echo "  • View dashboard: https://app.snyk.io"
echo ""
