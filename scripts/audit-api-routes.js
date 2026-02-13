#!/usr/bin/env node
/**
 * SwitchCV API Route Auditor (Refactored)
 */

const fs = require("fs");
const path = require("path");
const { findFiles, RED, GREEN, YELLOW, BLUE, DIM, BOLD, RESET } = require("./audit-utils");
const checks = require("./audit-checks");

// ─── Configuration ──────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(PROJECT_ROOT, "src/app/api");
const COMPONENTS_DIR = path.join(PROJECT_ROOT, "src/components");
const CONTEXT_DIR = path.join(PROJECT_ROOT, "src/context");
const HOOKS_DIR = path.join(PROJECT_ROOT, "src/hooks");
const SERVICES_DIR = path.join(PROJECT_ROOT, "src/lib/services");

const isCI = process.argv.includes("--ci");
const generateReport = process.argv.includes("--fix-report");

const findings = {
  critical: [],
  high: [],
  medium: [],
  info: [],
};

const reporter = {
  addFinding: (severity, file, rule, message, line = null) => {
    findings[severity].push({
      file: path.relative(PROJECT_ROOT, file),
      rule,
      message,
      line,
    });
  }
};

function runAudit() {
  console.log(`\n${BLUE}${BOLD}╔══════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}${BOLD}║     SwitchCV API Route Audit Report      ║${RESET}`);
  console.log(`${BLUE}${BOLD}╚══════════════════════════════════════════╝${RESET}\n`);

  // 1. Audit API routes
  const routeFiles = findFiles(API_DIR, /route\.ts$/);
  console.log(`${DIM}Scanning ${routeFiles.length} API route files...${RESET}`);
  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf8");
    checks.checkAuthentication(file, content, reporter, PROJECT_ROOT);
    checks.checkInputValidation(file, content, reporter);
    checks.checkErrorLeakage(file, content, reporter);
    checks.checkFirestoreLimit(file, content, reporter);
    checks.checkEslintDisableAbuse(file, content, reporter);
  }

  // 2. Audit components
  const componentFiles = findFiles(COMPONENTS_DIR, /\.(tsx|ts)$/);
  console.log(`${DIM}Scanning ${componentFiles.length} component files...${RESET}`);
  for (const file of componentFiles) {
    const content = fs.readFileSync(file, "utf8");
    checks.checkWindowAlert(file, content, reporter);
  }

  // 3. Audit providers/hooks
  const providerFiles = [...findFiles(CONTEXT_DIR, /\.(tsx|ts)$/), ...findFiles(HOOKS_DIR, /\.(tsx|ts)$/).filter(f => !f.includes(".test."))];
  console.log(`${DIM}Scanning ${providerFiles.length} provider/hook files...${RESET}`);
  for (const file of providerFiles) {
    const content = fs.readFileSync(file, "utf8");
    checks.checkProviderMemoization(file, content, reporter);
    checks.checkSWRPolling(file, content, reporter);
  }

  // 4. Audit services
  const serviceFiles = findFiles(SERVICES_DIR, /\.(ts|tsx)$/).filter(f => !f.includes(".test."));
  console.log(`${DIM}Scanning ${serviceFiles.length} service files...${RESET}`);
  for (const file of serviceFiles) {
    const content = fs.readFileSync(file, "utf8");
    checks.checkServiceFirestoreLimit(file, content, reporter);
  }

  // ─── Report ───────────────────────────────────────────────────────────

  const counts = {
    critical: findings.critical.length,
    high: findings.high.length,
    medium: findings.medium.length,
    info: findings.info.length
  };
  const totalIssues = Object.values(counts).reduce((a, b) => a + b, 0);

  if (counts.critical > 0) {
    console.log(`\n${RED}${BOLD}🔴 CRITICAL (${counts.critical})${RESET}`);
    findings.critical.forEach(f => console.log(`   ${RED}✖${RESET} ${BOLD}${f.file}${RESET}${f.line ? `:${f.line}` : ""}\n     ${DIM}[${f.rule}]${RESET} ${f.message}`));
  }
  if (counts.high > 0) {
    console.log(`\n${YELLOW}${BOLD}🟡 HIGH (${counts.high})${RESET}`);
    findings.high.forEach(f => console.log(`   ${YELLOW}▲${RESET} ${BOLD}${f.file}${RESET}${f.line ? `:${f.line}` : ""}\n     ${DIM}[${f.rule}]${RESET} ${f.message}`));
  }
  if (counts.medium > 0) {
    console.log(`\n${BLUE}${BOLD}🔵 MEDIUM (${counts.medium})${RESET}`);
    findings.medium.forEach(f => console.log(`   ${BLUE}●${RESET} ${BOLD}${f.file}${RESET}${f.line ? `:${f.line}` : ""}\n     ${DIM}[${f.rule}]${RESET} ${f.message}`));
  }

  console.log(`\n${BLUE}──────────────────────────────────────────${RESET}`);
  if (totalIssues === 0) {
    console.log(`${GREEN}${BOLD}✅ ALL CHECKS PASSED — No issues found${RESET}`);
  } else {
    console.log(`   ${RED}Critical: ${counts.critical}${RESET}  ${YELLOW}High: ${counts.high}${RESET}  ${BLUE}Medium: ${counts.medium}${RESET}  Info: ${counts.info}`);
    if (counts.critical > 0) console.log(`\n${RED}${BOLD}❌ AUDIT FAILED — ${counts.critical} critical issue(s) must be fixed${RESET}`);
  }
  console.log(`${BLUE}──────────────────────────────────────────${RESET}\n`);

  if (generateReport && totalIssues > 0) {
    fs.writeFileSync(path.join(PROJECT_ROOT, "audit-report.json"), JSON.stringify(findings, null, 2));
    console.log(`${DIM}Report written to: audit-report.json${RESET}\n`);
  }

  if (isCI && counts.critical > 0) process.exit(1);
  return counts.critical;
}

const criticalCount = runAudit();
if (criticalCount > 0) process.exit(1);
