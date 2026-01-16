# Security Scanning Scripts

## Snyk CLI Scanner

Comprehensive security scanning using Snyk CLI.

### Usage

```bash
# Run all scans
./scripts/snyk-scan.sh

# Scan only dependencies
./scripts/snyk-scan.sh deps

# Scan only code security issues
./scripts/snyk-scan.sh code

# Scan production dependencies only
./scripts/snyk-scan.sh prod

# Run all and upload to Snyk dashboard
./scripts/snyk-scan.sh all upload
```

### What It Scans

- **Dependencies**: All package.json files (main + functions)
- **Code Security**: Hardcoded secrets, SQL injection, XSS, etc.
- **Production**: Production dependencies only (excludes dev)

### Reports

All scan results are saved to `snyk-reports/` directory with timestamps.

### First Time Setup

```bash
# Authenticate with Snyk
npx snyk auth

# Run first scan
./scripts/snyk-scan.sh
```

## NPM Audit (Alternative)

For quick dependency checks without Snyk:

```bash
npm audit                    # All dependencies
npm audit --production       # Production only
npm audit fix                # Auto-fix issues
```

## GitHub Security Workflow

Automated scans run on:
- Every push to main/develop
- Every pull request
- Weekly schedule (Mondays 9 AM UTC)

See: `.github/workflows/security-scan.yml`
