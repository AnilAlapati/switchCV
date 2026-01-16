# Security Policy

## Supported Versions

We actively support the latest version of SwitchCV. Security updates are provided for:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest| :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. **Do Not** Open a Public Issue

Please **do not** open a public GitHub issue for security vulnerabilities. This helps prevent exploitation before a fix is available.

### 2. Report Privately

Send your vulnerability report privately to: **[security contact email - to be configured]**

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Triage**: Within 1 week
- **Fix Timeline**: Depends on severity
  - **Critical**: 1-7 days
  - **High**: 1-2 weeks
  - **Medium**: 2-4 weeks
  - **Low**: Next release cycle

### 4. Disclosure Process

1. We will confirm receipt of your report
2. We will investigate and validate the vulnerability
3. We will develop and test a fix
4. We will release the fix and notify you
5. We will publicly disclose the vulnerability (with credit to you, if desired)

## Security Best Practices

### For Contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Follow secure coding practices
- Run `npm audit` before submitting PRs
- Enable 2FA on your GitHub account

### For Users

- Keep your instance updated to the latest version
- Use strong, unique passwords
- Enable two-factor authentication
- Review and limit API access tokens
- Monitor audit logs regularly

## Security Features

### Authentication
- Firebase Authentication with OAuth 2.0
- Email verification required
- Rate limiting on authentication endpoints
- CSRF protection on state-changing operations

### Data Protection
- HTTPS/TLS encryption in transit
- Firebase security rules for database access control
- Role-based access control (RBAC)
- Audit logging for sensitive operations

### Application Security
- Content Security Policy (CSP) headers
- HTTP security headers (HSTS, X-Frame-Options, etc.)
- Cross-Origin policies
- Input validation and sanitization
- Prompt injection protection for AI features

### Infrastructure
- Automated dependency scanning
- CodeQL security analysis
- Secret scanning in repository
- Regular security audits

We use **GitHub's native FREE security tools** (no external services needed):

- **npm audit**: Automated vulnerability scanning ⭐ **Primary Tool**
- **CodeQL**: Advanced code security analysis (GitHub native)
- **Dependabot**: Automatic security updates (GitHub native)
- **Dependency Review**: Blocks PRs with vulnerable deps (GitHub native)
- **Secret Scanning**: Detects exposed credentials
- **GitHub Security Advisories**: CVE notifications

### Running Security Scans

```bash
# Local: Run npm audit
npm audit                    # Check for vulnerabilities
npm audit fix                # Auto-fix non-breaking issues
npm audit --audit-level=high # Show only high+ severity
npm audit --production       # Production deps only
```

### GitHub Actions (Automatic)

Security scans run automatically via [`.github/workflows/security-scan.yml`](file:///Users/anilalapati/Development/Switch_cv_Nov_21/.github/workflows/security-scan.yml):

**Triggers:**
- ✅ On every push to main/develop
- ✅ On every pull request
- ✅ Weekly schedule (Mondays 9 AM UTC)
- ✅ Manual trigger (workflow_dispatch)

**What's Scanned:**
1. **NPM Dependency Audit** - CVE scanning for all dependencies
2. **CodeQL Analysis** - Semantic code security analysis (JS/TS)
3. **Dependency Review** - Blocks PRs with vulnerable deps (moderate+)
4. **Secret Scanning** - TruffleHog for exposed credentials
5. **Security Headers Check** - Validates Next.js security config

**View Results:**
- **GitHub Security Tab** → See all security alerts
- **GitHub Actions Tab** → View scan reports
- **Pull Requests** → See security checks before merge


## Security Headers

Our application implements the following security headers:

- `Strict-Transport-Security`: Force HTTPS
- `Content-Security-Policy`: Prevent XSS attacks
- `X-Frame-Options`: Prevent clickjacking
- `X-Content-Type-Options`: Prevent MIME sniffing
- `Cross-Origin-Embedder-Policy`: Isolate from cross-origin
- `Cross-Origin-Opener-Policy`: Isolate browsing context
- `Cross-Origin-Resource-Policy`: Control resource sharing

## Known Security Considerations

### Public Profile Data
- Profile avatars and public assets are intentionally publicly readable
- This is required for recruiter visibility
- Private data remains protected by authentication

### Firebase Security Rules
- All collections have strict rule-based access control
- Backend operations use Admin SDK bypassing rules (as intended)
- Review `firestore.rules` for access control logic

## Security Contacts

- **Security Issues**: [To be configured]
- **General Support**: [To be configured]

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report vulnerabilities:

- Hall of Fame: [To be created]

---

Last Updated: 2026-01-16
