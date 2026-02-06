#!/usr/bin/env node
/**
 * ============================================================================
 * SwitchCV API Route Auditor
 * ============================================================================
 * Automatically scans EVERY API route for violations of mandatory rules.
 * Runs on pre-commit hook and blocks commits with critical issues.
 *
 * What it checks:
 *   1. Authentication — every route must call getAuthenticatedUserId
 *   2. Input validation — request bodies must use Zod schema validation
 *   3. Error leakage — error.message/error.stack must not reach client responses
 *   4. Accessibility — no window.alert() in React components
 *   5. Context memoization — providers must use useMemo for values
 *
 * Public route allowlist (these skip auth checks):
 *   - /api/health
 *   - /api/system-config
 *   - /api/auth/*
 *   - /api/user-approval/*
 *   - /api/seed/*
 *
 * Usage:
 *   node scripts/audit-api-routes.js           # Full audit
 *   node scripts/audit-api-routes.js --ci      # Exit 1 on any critical issue
 *   node scripts/audit-api-routes.js --fix-report  # Generate fix report
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Critical issues found (in --ci mode)
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Configuration ──────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(PROJECT_ROOT, "src/app/api");
const COMPONENTS_DIR = path.join(PROJECT_ROOT, "src/components");
const CONTEXT_DIR = path.join(PROJECT_ROOT, "src/context");
const HOOKS_DIR = path.join(PROJECT_ROOT, "src/hooks");

// Routes that are explicitly public (no auth required)
// Each must have a justification comment
const PUBLIC_ROUTE_PATTERNS = [
  /\/api\/health/,              // Public health check endpoint
  /\/api\/system-config/,      // Public app configuration (feature flags, etc.)
  /\/api\/auth\//,             // Auth endpoints (login, register, password reset)
  /\/api\/user-approval\//,    // Token-based public auth (email verification)
  /\/api\/seed\//,             // Dev-only seeding (should be env-gated)
  /\/api\/templates\/route/,   // Public read-only template catalog
  /\/api\/user\/username\/check/, // Public username availability check (signup flow)
  /\/api\/ai\/status/,         // AI service health check (similar to /health)
  /\/api\/recruiters\/verify-token/, // Token-based auth (not JWT-based)
];

const isCI = process.argv.includes("--ci");
const generateReport = process.argv.includes("--fix-report");

// ─── Color helpers ──────────────────────────────────────────────────────────

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ─── File discovery ─────────────────────────────────────────────────────────

function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, pattern, results);
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function getRelativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath);
}

function isPublicRoute(filePath) {
  const relative = getRelativePath(filePath);
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(relative));
}

// ─── Checks ─────────────────────────────────────────────────────────────────

const findings = {
  critical: [],
  high: [],
  medium: [],
  info: [],
};

function addFinding(severity, file, rule, message, line = null) {
  findings[severity].push({
    file: getRelativePath(file),
    rule,
    message,
    line,
  });
}

/**
 * CHECK 1: Authentication
 * Every API route handler must call getAuthenticatedUserId or maybeGetAuthenticatedUserId
 */
function checkAuthentication(filePath, content) {
  if (isPublicRoute(filePath)) return;

  const hasAuth =
    content.includes("getAuthenticatedUserId") ||
    content.includes("maybeGetAuthenticatedUserId");

  if (!hasAuth) {
    addFinding(
      "critical",
      filePath,
      "AUTH_MISSING",
      "No authentication! Route does not call getAuthenticatedUserId(). " +
        "Any anonymous user can access this endpoint. " +
        "Add: const { userId, error } = await getAuthenticatedUserId(request); if (error) return error;"
    );
  }

  // Check for userId accepted from request body (impersonation risk)
  const bodyUserIdPattern =
    /const\s*\{[^}]*userId[^}]*\}\s*=\s*(?:await\s+)?(?:request\.json|body|await\s+request\.json)/;
  if (bodyUserIdPattern.test(content) && !hasAuth) {
    addFinding(
      "critical",
      filePath,
      "AUTH_USERID_FROM_BODY",
      "userId is read from request body without server-side authentication! " +
        "An attacker can send any userId via curl. " +
        "Use getAuthenticatedUserId(request) to get the verified userId from the JWT token."
    );
  }
}

/**
 * CHECK 2: Input Validation
 * POST/PUT/PATCH handlers must validate input with Zod
 */
function checkInputValidation(filePath, content) {
  const hasPostOrPut =
    /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/m.test(content);
  if (!hasPostOrPut) return;

  const hasRequestBody =
    content.includes("request.json()") || content.includes("await request.json");

  if (!hasRequestBody) return; // GET-only or no body parsing

  const hasZodValidation =
    content.includes(".parse(") ||
    content.includes(".safeParse(") ||
    content.includes("Schema.parse") ||
    content.includes("Schema.safeParse") ||
    content.includes("z.object(");

  if (!hasZodValidation) {
    addFinding(
      "high",
      filePath,
      "VALIDATION_MISSING",
      "Request body is read but no Zod schema validation found. " +
        "Raw request.json() data is being used directly. " +
        "Add a Zod schema: const data = InputSchema.parse(await request.json());"
    );
  }
}

/**
 * CHECK 3: Error Leakage
 * Error details must not be sent to clients
 */
function checkErrorLeakage(filePath, content) {
  const lines = content.split("\n");

  lines.forEach((line, i) => {
    const lineNum = i + 1;

    // Pattern: error.message in JSON response
    if (
      /NextResponse\.json\(.*error\.message/.test(line) ||
      /NextResponse\.json\(.*err\.message/.test(line)
    ) {
      addFinding(
        "high",
        filePath,
        "ERROR_LEAKAGE",
        `error.message exposed in client response. Use handleApiError() instead.`,
        lineNum
      );
    }

    // Pattern: error.stack in response
    if (/NextResponse\.json\(.*\.stack/.test(line)) {
      addFinding(
        "critical",
        filePath,
        "ERROR_STACK_LEAKAGE",
        `Stack trace exposed in client response! This reveals internal code structure.`,
        lineNum
      );
    }

    // Pattern: template literal with error in response
    if (/NextResponse\.json\(\s*\{[^}]*`[^`]*\$\{.*err/.test(line)) {
      addFinding(
        "high",
        filePath,
        "ERROR_INTERPOLATION",
        `Error interpolated into client response. Use handleApiError() for safe errors.`,
        lineNum
      );
    }
  });
}

/**
 * CHECK 4: window.alert() usage in components
 */
function checkWindowAlert(filePath, content) {
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (/window\.alert\(/.test(line) || /\balert\(/.test(line)) {
      // Skip if it's in a comment
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

      addFinding(
        "medium",
        filePath,
        "WINDOW_ALERT",
        `window.alert() used for feedback. Use toast() from sonner instead.`,
        i + 1
      );
    }
  });
}

/**
 * CHECK 5: Context providers must memoize values
 */
function checkProviderMemoization(filePath, content) {
  // Only check files that create Context Providers
  if (!content.includes("Provider value=")) return;
  if (!content.includes("createContext")) return;

  const hasUseMemo = content.includes("useMemo");
  if (!hasUseMemo) {
    addFinding(
      "high",
      filePath,
      "PROVIDER_NO_MEMO",
      "Context Provider value is not wrapped in useMemo(). " +
        "Every state change will re-render ALL consumers. " +
        "Wrap the value object in useMemo() with correct dependencies."
    );
  }
}

/**
 * CHECK 6: Firestore queries must have .limit()
 */
function checkFirestoreLimit(filePath, content) {
  // Only relevant for files that query Firestore
  if (
    !content.includes(".collection(") &&
    !content.includes("adminDb.") &&
    !content.includes("getDocs(")
  )
    return;

  const hasCollectionQuery = /\.collection\([^)]+\)\.(?:where|orderBy|get)\(/m.test(content);
  const hasLimit = content.includes(".limit(");

  if (hasCollectionQuery && !hasLimit) {
    addFinding(
      "medium",
      filePath,
      "FIRESTORE_NO_LIMIT",
      "Firestore collection query without .limit(). " +
        "This can read the entire collection and cause cost spikes. " +
        "Add .limit(N) to bound the query."
    );
  }
}

/**
 * CHECK 8: Detect eslint-disable used to bypass security rules
 * This is the #1 way AI agents "fix" lint errors — by silencing them.
 */
function checkEslintDisableAbuse(filePath, content) {
  const lines = content.split("\n");
  // Rules that should NEVER be disabled in production API routes
  const protectedRules = [
    "no-restricted-imports",
    "no-restricted-syntax",
  ];

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const trimmed = line.trim();

    if (!trimmed.includes("eslint-disable")) return;

    for (const rule of protectedRules) {
      if (trimmed.includes(rule)) {
        addFinding(
          "high",
          filePath,
          "ESLINT_DISABLE_BYPASS",
          `eslint-disable used to bypass "${rule}". ` +
            `An AI agent likely silenced this error instead of fixing the root cause. ` +
            `Remove the disable comment and fix the underlying architecture issue.`,
          lineNum
        );
      }
    }
  });
}

/**
 * CHECK 7: SWR polling intervals must be >= 5 minutes
 */
function checkSWRPolling(filePath, content) {
  const refreshMatch = content.match(/refreshInterval\s*:\s*(\d+)/g);
  if (!refreshMatch) return;

  refreshMatch.forEach((match) => {
    const interval = parseInt(match.replace(/\D/g, ""), 10);
    if (interval > 0 && interval < 300000) {
      // Less than 5 minutes
      addFinding(
        "medium",
        filePath,
        "SWR_FAST_POLLING",
        `SWR refreshInterval is ${interval}ms (${(interval / 1000 / 60).toFixed(1)} min). ` +
          `Minimum should be 300000ms (5 min) to avoid excessive Firestore reads.`
      );
    }
  });
}

// ─── Run all checks ─────────────────────────────────────────────────────────

function runAudit() {
  console.log(`\n${BLUE}${BOLD}╔══════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}${BOLD}║     SwitchCV API Route Audit Report      ║${RESET}`);
  console.log(`${BLUE}${BOLD}╚══════════════════════════════════════════╝${RESET}\n`);

  // 1. Audit API routes
  const routeFiles = findFiles(API_DIR, /route\.ts$/);
  console.log(`${DIM}Scanning ${routeFiles.length} API route files...${RESET}`);

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf8");
    checkAuthentication(file, content);
    checkInputValidation(file, content);
    checkErrorLeakage(file, content);
    checkFirestoreLimit(file, content);
    checkEslintDisableAbuse(file, content);
  }

  // 2. Audit components for window.alert
  const componentFiles = findFiles(COMPONENTS_DIR, /\.(tsx|ts)$/);
  console.log(`${DIM}Scanning ${componentFiles.length} component files...${RESET}`);

  for (const file of componentFiles) {
    const content = fs.readFileSync(file, "utf8");
    checkWindowAlert(file, content);
  }

  // 3. Audit context providers for memoization
  const contextFiles = findFiles(CONTEXT_DIR, /\.(tsx|ts)$/);
  const hookFiles = findFiles(HOOKS_DIR, /\.(tsx|ts)$/).filter(
    (f) => !f.includes(".test.")
  );
  const providerFiles = [...contextFiles, ...hookFiles];
  console.log(`${DIM}Scanning ${providerFiles.length} provider/hook files...${RESET}`);

  for (const file of providerFiles) {
    const content = fs.readFileSync(file, "utf8");
    checkProviderMemoization(file, content);
    checkSWRPolling(file, content);
  }

  // 4. Check hooks for SWR polling
  for (const file of hookFiles) {
    const content = fs.readFileSync(file, "utf8");
    checkSWRPolling(file, content);
  }

  // ─── Report ───────────────────────────────────────────────────────────

  const totalCritical = findings.critical.length;
  const totalHigh = findings.high.length;
  const totalMedium = findings.medium.length;
  const totalInfo = findings.info.length;
  const totalIssues = totalCritical + totalHigh + totalMedium + totalInfo;

  if (totalCritical > 0) {
    console.log(`\n${RED}${BOLD}🔴 CRITICAL (${totalCritical})${RESET}`);
    findings.critical.forEach((f) => {
      console.log(`   ${RED}✖${RESET} ${BOLD}${f.file}${RESET}${f.line ? `:${f.line}` : ""}`);
      console.log(`     ${DIM}[${f.rule}]${RESET} ${f.message}`);
    });
  }

  if (totalHigh > 0) {
    console.log(`\n${YELLOW}${BOLD}🟡 HIGH (${totalHigh})${RESET}`);
    findings.high.forEach((f) => {
      console.log(`   ${YELLOW}▲${RESET} ${BOLD}${f.file}${RESET}${f.line ? `:${f.line}` : ""}`);
      console.log(`     ${DIM}[${f.rule}]${RESET} ${f.message}`);
    });
  }

  if (totalMedium > 0) {
    console.log(`\n${BLUE}${BOLD}🔵 MEDIUM (${totalMedium})${RESET}`);
    findings.medium.forEach((f) => {
      console.log(`   ${BLUE}●${RESET} ${BOLD}${f.file}${RESET}${f.line ? `:${f.line}` : ""}`);
      console.log(`     ${DIM}[${f.rule}]${RESET} ${f.message}`);
    });
  }

  // Summary
  console.log(`\n${BLUE}──────────────────────────────────────────${RESET}`);
  if (totalIssues === 0) {
    console.log(`${GREEN}${BOLD}✅ ALL CHECKS PASSED — No issues found${RESET}`);
  } else {
    console.log(
      `   ${RED}Critical: ${totalCritical}${RESET}  ` +
        `${YELLOW}High: ${totalHigh}${RESET}  ` +
        `${BLUE}Medium: ${totalMedium}${RESET}  ` +
        `Info: ${totalInfo}`
    );

    if (totalCritical > 0) {
      console.log(
        `\n${RED}${BOLD}❌ AUDIT FAILED — ${totalCritical} critical issue(s) must be fixed${RESET}`
      );
    }
  }
  console.log(`${BLUE}──────────────────────────────────────────${RESET}\n`);

  // Generate fix report if requested
  if (generateReport && totalIssues > 0) {
    const reportPath = path.join(PROJECT_ROOT, "audit-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2));
    console.log(`${DIM}Report written to: ${reportPath}${RESET}\n`);
  }

  // Exit code
  if (isCI && totalCritical > 0) {
    process.exit(1);
  }

  return totalCritical;
}

const criticalCount = runAudit();
if (criticalCount > 0) {
  process.exit(1);
}
