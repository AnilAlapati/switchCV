#!/usr/bin/env node
/**
 * SwitchCV Test Quality Auditor
 *
 * Detects placeholder, broken, and fake tests that inflate pass counts
 * but provide zero actual coverage.
 *
 * Why this exists: AI agents generate tests that assert on request construction
 * (e.g., expect(request.method).toBe("POST")) instead of testing actual route
 * handlers. These tests pass but verify nothing. See docs/LESSONS_LEARNED.md.
 *
 * Usage:
 *   node scripts/audit-test-quality.js         # Full scan
 *   node scripts/audit-test-quality.js --ci    # Exit 1 on critical issues
 */

const fs = require("fs");
const path = require("path");
const { findFiles, RED, GREEN, YELLOW, BLUE, DIM, BOLD, RESET } = require("./audit-utils");

// ─── Configuration ──────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "..");
const TEST_DIRS = [
    path.join(PROJECT_ROOT, "src/__tests__"),
    path.join(PROJECT_ROOT, "src"),
];

const isCI = process.argv.includes("--ci");

const findings = {
    critical: [],
    high: [],
    medium: [],
    info: [],
};

function addFinding(severity, file, rule, message, details = null) {
    findings[severity].push({
        file: path.relative(PROJECT_ROOT, file),
        rule,
        message,
        details,
    });
}

// ─── Check 1: Placeholder Tests ─────────────────────────────────────────────
// Tests that only assert on request.method or request.headers — they test
// the Node.js fetch API, not any application code.

function checkPlaceholderTests(filePath, content) {
    const testBlocks = extractTestBlocks(content);

    let placeholderCount = 0;
    for (const block of testBlocks) {
        const body = block.body;

        // Test that only asserts on request.method
        if (/expect\(request\.method\)/.test(body) && !hasRouteHandlerCall(body)) {
            placeholderCount++;
        }

        // Test that only asserts on request.headers.get
        if (/expect\(request\.headers\.get/.test(body) && !hasRouteHandlerCall(body)) {
            placeholderCount++;
        }
    }

    if (placeholderCount > 0) {
        addFinding(
            "critical",
            filePath,
            "PLACEHOLDER_TESTS",
            `${placeholderCount} test(s) assert on request construction (method/headers) but never invoke a route handler. ` +
            `These tests inflate pass counts while testing nothing. ` +
            `Fix: Import and call the actual GET/POST handler, assert on response status/body.`
        );
    }
}

// ─── Check 2: Empty/Trivial Tests ───────────────────────────────────────────
// Tests with expect(true).toBe(true), no assertions, or only trivial assertions.

function checkEmptyTests(filePath, content) {
    const testBlocks = extractTestBlocks(content);

    let trivialCount = 0;
    for (const block of testBlocks) {
        const body = block.body;

        // expect(true).toBe(true) or expect(1).toBe(1)
        if (/expect\(true\)\.toBe\(true\)/.test(body) || /expect\(1\)\.toBe\(1\)/.test(body)) {
            // Check if this is the ONLY assertion in the block
            const allExpects = body.match(/expect\(/g);
            const trivialExpects = body.match(/expect\((?:true|1|false|0)\)\.toBe/g);
            if (allExpects && trivialExpects && allExpects.length === trivialExpects.length) {
                trivialCount++;
            }
        }

        // No assertions at all
        if (!/expect\(/.test(body) && !/assert/.test(body) && !/toHaveBeenCalled/.test(body) && body.trim().length > 0) {
            // Exclude .todo() and .skip() tests
            if (!block.header.includes(".todo") && !block.header.includes(".skip")) {
                trivialCount++;
            }
        }
    }

    if (trivialCount > 0) {
        addFinding(
            "critical",
            filePath,
            "TRIVIAL_TESTS",
            `${trivialCount} test(s) use trivial assertions like expect(true).toBe(true) or have no assertions. ` +
            `These provide false coverage. Either implement real assertions or delete them.`
        );
    }
}

// ─── Check 3: Missing Auth Mock ─────────────────────────────────────────────
// API test files that import route handlers but don't mock getAuthenticatedUserId.
// This is the root cause of ~35 of 42 test failures returning 403.

function checkMissingAuthMock(filePath, content) {
    // Only check API test files
    const relPath = path.relative(PROJECT_ROOT, filePath);
    if (!relPath.includes("api") && !relPath.includes("route.test")) return;

    // Check if tests import from a route file
    const importsRoute = /from\s+['"][^'"]*route['"]/.test(content) ||
        /require\(['"][^'"]*route['"]\)/.test(content);
    if (!importsRoute) return;

    // Check if getAuthenticatedUserId is mocked
    const mocksAuth = content.includes("getAuthenticatedUserId") ||
        content.includes("api-helpers") ||
        content.includes("maybeGetAuthenticatedUserId");

    if (!mocksAuth) {
        addFinding(
            "high",
            filePath,
            "MISSING_AUTH_MOCK",
            `Test imports route handler but does not mock getAuthenticatedUserId. ` +
            `All tests will return 403 Forbidden. ` +
            `Add: jest.mock("@/lib/utils/api-helpers", () => ({ getAuthenticatedUserId: jest.fn() }))`
        );
    }
}

// ─── Check 4: All-403 Pattern ───────────────────────────────────────────────
// Test files where expects mention 200/201 but the pattern suggests they'll all 403.
// Detects: mock setup that returns { userId: null, error: response } instead of { userId: "...", error: null }

function checkBroken403Pattern(filePath, content) {
    const relPath = path.relative(PROJECT_ROOT, filePath);
    if (!relPath.includes("api") && !relPath.includes("route.test")) return;

    // Check if getAuthenticatedUserId is mocked to return an error
    // Check for broken mocks: userId is null/undefined OR error is a Response/Error/static-string (but NOT null)
    const mockReturnsError = /getAuthenticatedUserId[\s\S]*?mockResolvedValue\s*\(\s*\{[\s\S]*?error\s*:\s*(?!null)[^,}]/.test(content);
    const mockReturnsNull = /getAuthenticatedUserId[\s\S]*?mockResolvedValue\s*\(\s*\{[\s\S]*?userId\s*:\s*(?:null|undefined)/.test(content);

    if (mockReturnsError || mockReturnsNull) {
        // Check if there are expects for 200/201 status codes
        const expects200 = /expect.*status.*200|expect.*200|\.status\)\.toBe\(200\)|toEqual.*200/.test(content);
        const expects201 = /expect.*status.*201|expect.*201|\.status\)\.toBe\(201\)|toEqual.*201/.test(content);

        if (expects200 || expects201) {
            addFinding(
                "high",
                filePath,
                "AUTH_MOCK_ALWAYS_REJECTS",
                `Auth mock returns error/null userId, but tests expect 200/201. ` +
                `All tests will fail with 403. Fix the mock to return { userId: "test-user", error: null }.`
            );
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractTestBlocks(content) {
    const blocks = [];
    // Match it("...", () => { ... }) and test("...", () => { ... })
    const testPattern = /(?:it|test)\s*(?:\.skip|\.only)?\s*\(\s*(['"`])(.*?)\1\s*,\s*(?:async\s+)?(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/g;
    let match;

    while ((match = testPattern.exec(content)) !== null) {
        const startIdx = match.index + match[0].length;
        const body = extractBalancedBraces(content, startIdx);
        blocks.push({
            header: match[0],
            name: match[2],
            body: body,
            startLine: content.substring(0, match.index).split("\n").length,
        });
    }

    return blocks;
}

function extractBalancedBraces(content, startIdx) {
    let depth = 1;
    let i = startIdx;
    while (i < content.length && depth > 0) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") depth--;
        i++;
    }
    return content.substring(startIdx, i - 1);
}

function hasRouteHandlerCall(body) {
    // Check if the test actually calls GET, POST, PUT, DELETE, PATCH
    return /\b(?:GET|POST|PUT|DELETE|PATCH)\s*\(/.test(body) ||
        /await\s+(?:GET|POST|PUT|DELETE|PATCH)\s*\(/.test(body) ||
        /handler\s*\(/.test(body) ||
        /route\s*\(/.test(body);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function runTestQualityAudit() {
    console.log(`\n${BLUE}${BOLD}╔══════════════════════════════════════════╗${RESET}`);
    console.log(`${BLUE}${BOLD}║    SwitchCV Test Quality Audit Report    ║${RESET}`);
    console.log(`${BLUE}${BOLD}╚══════════════════════════════════════════╝${RESET}\n`);

    // Find all test files
    const testFiles = [];
    for (const dir of TEST_DIRS) {
        testFiles.push(...findFiles(dir, /\.test\.(ts|tsx|js|jsx)$/));
    }
    // Deduplicate
    const uniqueFiles = [...new Set(testFiles)];

    console.log(`${DIM}Scanning ${uniqueFiles.length} test files...${RESET}`);

    for (const file of uniqueFiles) {
        const content = fs.readFileSync(file, "utf8");
        checkPlaceholderTests(file, content);
        checkEmptyTests(file, content);
        checkMissingAuthMock(file, content);
        checkBroken403Pattern(file, content);
    }

    // ─── Report ───────────────────────────────────────────────────────────
    const counts = {
        critical: findings.critical.length,
        high: findings.high.length,
        medium: findings.medium.length,
        info: findings.info.length,
    };
    const totalIssues = Object.values(counts).reduce((a, b) => a + b, 0);

    if (counts.critical > 0) {
        console.log(`\n${RED}${BOLD}🔴 CRITICAL (${counts.critical})${RESET}`);
        findings.critical.forEach(f =>
            console.log(`   ${RED}✖${RESET} ${BOLD}${f.file}${RESET}\n     ${DIM}[${f.rule}]${RESET} ${f.message}`)
        );
    }
    if (counts.high > 0) {
        console.log(`\n${YELLOW}${BOLD}🟡 HIGH (${counts.high})${RESET}`);
        findings.high.forEach(f =>
            console.log(`   ${YELLOW}▲${RESET} ${BOLD}${f.file}${RESET}\n     ${DIM}[${f.rule}]${RESET} ${f.message}`)
        );
    }
    if (counts.medium > 0) {
        console.log(`\n${BLUE}${BOLD}🔵 MEDIUM (${counts.medium})${RESET}`);
        findings.medium.forEach(f =>
            console.log(`   ${BLUE}●${RESET} ${BOLD}${f.file}${RESET}\n     ${DIM}[${f.rule}]${RESET} ${f.message}`)
        );
    }

    console.log(`\n${BLUE}──────────────────────────────────────────${RESET}`);
    if (totalIssues === 0) {
        console.log(`${GREEN}${BOLD}✅ ALL TESTS PASS QUALITY CHECK${RESET}`);
    } else {
        console.log(`   ${RED}Critical: ${counts.critical}${RESET}  ${YELLOW}High: ${counts.high}${RESET}  ${BLUE}Medium: ${counts.medium}${RESET}  Info: ${counts.info}`);
        if (counts.critical > 0) {
            console.log(`\n${RED}${BOLD}❌ TEST QUALITY AUDIT FAILED — ${counts.critical} critical issue(s)${RESET}`);
            console.log(`${DIM}   These tests inflate pass counts while verifying nothing.${RESET}`);
            console.log(`${DIM}   Fix or delete them before they give false confidence.${RESET}`);
        }
    }
    console.log(`${BLUE}──────────────────────────────────────────${RESET}\n`);

    if (isCI && counts.critical > 0) process.exit(1);
    return counts.critical;
}

const criticalCount = runTestQualityAudit();
if (criticalCount > 0) process.exit(1);
