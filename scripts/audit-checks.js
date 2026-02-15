const path = require("path");

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

function isPublicRoute(filePath, projectRoot) {
    const relative = path.relative(projectRoot, filePath);
    return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(relative));
}

/**
 * CHECK 1: Authentication
 */
function checkAuthentication(filePath, content, reporter, projectRoot) {
    if (isPublicRoute(filePath, projectRoot)) return;

    const hasAuth =
        content.includes("getAuthenticatedUserId") ||
        content.includes("maybeGetAuthenticatedUserId");

    if (!hasAuth) {
        reporter.addFinding(
            "critical",
            filePath,
            "AUTH_MISSING",
            "No authentication! Route does not call getAuthenticatedUserId(). " +
            "Any anonymous user can access this endpoint. " +
            "Add: const { userId, error } = await getAuthenticatedUserId(request); if (error) return error;"
        );
    }

    const bodyUserIdPattern =
        /const\s*\{[^}]*userId[^}]*\}\s*=\s*(?:await\s+)?(?:request\.json|body|await\s+request\.json)/;
    if (bodyUserIdPattern.test(content) && !hasAuth) {
        reporter.addFinding(
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
 */
function checkInputValidation(filePath, content, reporter) {
    const hasPostOrPut =
        /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/m.test(content);
    if (!hasPostOrPut) return;

    const hasRequestBody =
        content.includes("request.json()") || content.includes("await request.json");

    if (!hasRequestBody) return;

    const hasZodValidation =
        content.includes(".parse(") ||
        content.includes(".safeParse(") ||
        content.includes("Schema.parse") ||
        content.includes("Schema.safeParse") ||
        content.includes("z.object(");

    if (!hasZodValidation) {
        reporter.addFinding(
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
 */
function checkErrorLeakage(filePath, content, reporter) {
    const lines = content.split("\n");
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        if (
            /NextResponse\.json\(.*error\.message/.test(line) ||
            /NextResponse\.json\(.*err\.message/.test(line)
        ) {
            reporter.addFinding(
                "high",
                filePath,
                "ERROR_LEAKAGE",
                `error.message exposed in client response. Use handleApiError() instead.`,
                lineNum
            );
        }
        if (/NextResponse\.json\(.*\.stack/.test(line)) {
            reporter.addFinding(
                "critical",
                filePath,
                "ERROR_STACK_LEAKAGE",
                `Stack trace exposed in client response! This reveals internal code structure.`,
                lineNum
            );
        }
        if (/NextResponse\.json\(\s*\{[^}]*`[^`]*\$\{.*err/.test(line)) {
            reporter.addFinding(
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
 * CHECK 4: window.alert() usage
 */
function checkWindowAlert(filePath, content, reporter) {
    const lines = content.split("\n");
    lines.forEach((line, i) => {
        if (/window\.alert\(/.test(line) || /\balert\(/.test(line)) {
            const trimmed = line.trim();
            if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
            reporter.addFinding(
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
 * CHECK 5: Context providers memoization
 */
function checkProviderMemoization(filePath, content, reporter) {
    if (!content.includes("Provider value=")) return;
    if (!content.includes("createContext")) return;
    if (!content.includes("useMemo")) {
        reporter.addFinding(
            "high",
            filePath,
            "PROVIDER_NO_MEMO",
            "Context Provider value is not wrapped in useMemo()."
        );
    }
}

/**
 * CHECK 6: Firestore queries .limit()
 */
function checkFirestoreLimit(filePath, content, reporter) {
    if (!content.includes(".collection(") && !content.includes("adminDb.") && !content.includes("getDocs(")) return;
    const hasCollectionQuery = /\.collection\([^)]+\)\.(?:where|orderBy|get)\(/m.test(content);
    if (hasCollectionQuery && !content.includes(".limit(")) {
        reporter.addFinding(
            "medium",
            filePath,
            "FIRESTORE_NO_LIMIT",
            "Firestore collection query without .limit()."
        );
    }
}

/**
 * CHECK 8: eslint-disable abuse
 */
function checkEslintDisableAbuse(filePath, content, reporter) {
    const lines = content.split("\n");
    const protectedRules = ["no-restricted-imports", "no-restricted-syntax"];
    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed.includes("eslint-disable")) return;
        for (const rule of protectedRules) {
            if (trimmed.includes(rule)) {
                reporter.addFinding(
                    "high",
                    filePath,
                    "ESLINT_DISABLE_BYPASS",
                    `eslint-disable used to bypass "${rule}".`,
                    i + 1
                );
            }
        }
    });
}

/**
 * CHECK 7 & 9: SWR polling
 */
function checkSWRPolling(filePath, content, reporter) {
    const refreshMatch = content.match(/refreshInterval\s*:\s*(\d+)/g);
    if (refreshMatch) {
        refreshMatch.forEach((match) => {
            const interval = parseInt(match.replace(/\D/g, ""), 10);
            if (interval > 0 && interval < 300000) {
                reporter.addFinding("medium", filePath, "SWR_FAST_POLLING", `SWR refreshInterval is ${interval}ms.`);
            }
        });
    }
    if (/revalidateOnFocus\s*:\s*true/.test(content)) {
        reporter.addFinding("high", filePath, "SWR_REVALIDATE_ON_FOCUS", "revalidateOnFocus: true used.");
    }
}

/**
 * CHECK 10: Service files Firestore limit
 */
function checkServiceFirestoreLimit(filePath, content, reporter) {
    if (!content.includes("adminDb") && !content.includes("collectionGroup")) return;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\.\s*get\s*\(\s*\)/.test(line)) {
            const contextLines = lines.slice(Math.max(0, i - 5), i + 1).join("\n");
            if (/\.doc\s*\([^)]+\)\s*\.\s*get\s*\(\s*\)/.test(contextLines)) continue;
            if (/\.count\s*\(\s*\)\s*\.\s*get\s*\(\s*\)/.test(contextLines)) continue;
            if ((contextLines.includes(".where(") || contextLines.includes(".orderBy(") || contextLines.includes("collectionGroup(")) && !contextLines.includes(".limit(")) {
                reporter.addFinding("high", filePath, "SERVICE_UNBOUNDED_QUERY", `Firestore query at line ${i + 1} without .limit().`, i + 1);
            }
        }
    }
}

/**
 * CHECK 11: Auth ordering — auth must come before body parsing
 * Catches: request.json() called BEFORE getAuthenticatedUserId()
 * Recurring issue: interview/assistant/route.ts (P0 in v5 review)
 */
function checkAuthOrdering(filePath, content, reporter, projectRoot) {
    if (isPublicRoute(filePath, projectRoot)) return;

    const hasAuth = content.includes("getAuthenticatedUserId");
    if (!hasAuth) return; // Already caught by CHECK 1

    // Find positions of body parsing and auth calls
    const bodyParseMatch = content.match(/(?:await\s+)?request\.json\s*\(\s*\)/);
    const authMatch = content.match(/getAuthenticatedUserId\s*\(/);

    if (bodyParseMatch && authMatch) {
        const bodyParsePos = content.indexOf(bodyParseMatch[0]);
        const authPos = content.indexOf(authMatch[0]);

        if (bodyParsePos < authPos) {
            const lineNum = content.substring(0, bodyParsePos).split("\n").length;
            reporter.addFinding(
                "critical",
                filePath,
                "AUTH_ORDERING",
                "request.json() is called BEFORE getAuthenticatedUserId(). " +
                "Unauthenticated requests still trigger body parsing, wasting CPU and leaking endpoint behavior. " +
                "Move auth check above body parse.",
                lineNum
            );
        }
    }
}

/**
 * CHECK 12: Error interpolation inside handleApiError()
 * Catches: handleApiError(err, `Validation error: ${errorMessage}`)
 * The existing checkErrorLeakage only catches NextResponse.json({error: error.message}).
 * This catches the subtler pattern where error details are interpolated into the
 * "safe" message parameter of handleApiError().
 * Recurring issue: request-access, jd-search, drafts routes (P1 in v5 review)
 */
function checkErrorInterpolationInHandler(filePath, content, reporter) {
    const lines = content.split("\n");
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        // handleApiError(err, `...${anything}...`) — template literal as message
        if (/handleApiError\s*\([^,]*,\s*`[^`]*\$\{/.test(line)) {
            reporter.addFinding(
                "high",
                filePath,
                "ERROR_INTERPOLATION_IN_HANDLER",
                "Error details interpolated into handleApiError() message parameter. " +
                "handleApiError() passes its message to the client. Use a static string instead: " +
                "handleApiError(err, 'Operation failed')",
                lineNum
            );
        }
        // Also catch: handleApiError(err, "prefix" + errorMessage)
        if (/handleApiError\s*\([^,]*,\s*[^)]*\+\s*(?:error|err|e\b)/.test(line)) {
            reporter.addFinding(
                "high",
                filePath,
                "ERROR_CONCAT_IN_HANDLER",
                "Error variable concatenated into handleApiError() message. Use a static string.",
                lineNum
            );
        }
    });
}

/**
 * CHECK 13: userId priority inversion — body userId takes precedence over auth userId
 * Catches: const x = body.userId || authenticatedUserId (body has priority!)
 *          const x = parseResult.data.userId || authenticatedUserId
 * Recurring issue: skills/route.ts, interview/assistant/route.ts (P0 in v5 review)
 */
function checkUserIdPriorityInversion(filePath, content, reporter, projectRoot) {
    if (isPublicRoute(filePath, projectRoot)) return;

    const lines = content.split("\n");
    lines.forEach((line, i) => {
        const lineNum = i + 1;
        // Pattern: someVar.userId || authenticatedUserId (body has priority over auth)
        if (/(?:body|data|parseResult|parsed|input|params)\S*\.userId\s*\|\|?\s*authenticated/i.test(line)) {
            reporter.addFinding(
                "critical",
                filePath,
                "USERID_PRIORITY_INVERSION",
                "Body-supplied userId has PRIORITY over authenticatedUserId! " +
                "An attacker can impersonate any user by passing userId in the request body. " +
                "Use authenticatedUserId exclusively: const userId = authenticatedUserId;",
                lineNum
            );
        }
        // Pattern: authenticatedUserId || body.userId (body used as fallback — also dangerous)
        if (/authenticated\w*\s*\|\|?\s*(?:body|data|parseResult|parsed)\S*\.?userId/i.test(line)) {
            reporter.addFinding(
                "high",
                filePath,
                "USERID_BODY_FALLBACK",
                "Body-supplied userId used as fallback for authenticatedUserId. " +
                "NEVER use body userId even as a fallback. Use authenticatedUserId exclusively.",
                lineNum
            );
        }
    });
}

/**
 * CHECK 14: Accessibility basics for components
 * Catches: <svg without aria-hidden, animate-spin without role="status"
 * Recurring issue: ~220 violations across 66+ files (P2 in v5 review)
 */
function checkAccessibilityBasics(filePath, content, reporter) {
    const lines = content.split("\n");
    let svgWithoutAria = 0;
    let spinnerWithoutRole = 0;

    lines.forEach((line, i) => {
        // SVG without aria-hidden (only inline SVGs in JSX, not imports)
        if (/<svg[\s>]/.test(line) && !line.includes("aria-hidden")) {
            svgWithoutAria++;
        }
        // animate-spin without role="status" nearby (check current line and next 2 lines)
        if (/animate-spin/.test(line)) {
            const context = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
            if (!context.includes('role="status"') && !context.includes("role={'status'}") && !context.includes("role=\"status\"")) {
                spinnerWithoutRole++;
            }
        }
    });

    if (svgWithoutAria > 0) {
        reporter.addFinding(
            "medium",
            filePath,
            "A11Y_SVG_NO_ARIA",
            `${svgWithoutAria} inline <svg> element(s) missing aria-hidden="true". Add aria-hidden="true" to decorative SVGs.`
        );
    }
    if (spinnerWithoutRole > 0) {
        reporter.addFinding(
            "medium",
            filePath,
            "A11Y_SPINNER_NO_ROLE",
            `${spinnerWithoutRole} loading spinner(s) using animate-spin without role="status". Add role="status" aria-live="polite".`
        );
    }
}

/**
 * CHECK 15: Controlled form inputs — detect missing ?? "" / || "" fallbacks
 * Catches: useState<SomeType>({}) without initialized string fields
 * Recurring issue: 4 onboarding steps, profile settings (P2 in v5 review)
 */
function checkFormControlledInputs(filePath, content, reporter) {
    // Only check files with form inputs
    if (!/<input[\s>]/.test(content) && !/<textarea[\s>]/.test(content) && !/<Input[\s>]/.test(content)) return;

    // Pattern: useState<Type>({}) — empty object initialization with a type parameter
    const emptyStatePattern = /useState\s*<[^>]+>\s*\(\s*\{\s*\}\s*\)/g;
    let match;
    while ((match = emptyStatePattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        reporter.addFinding(
            "medium",
            filePath,
            "FORM_EMPTY_STATE",
            "useState<Type>({}) with empty object — form inputs may switch between controlled/uncontrolled. " +
            "Initialize all string fields with default values: useState({ field: '' })",
            lineNum
        );
    }
}

module.exports = {
    checkAuthentication,
    checkInputValidation,
    checkErrorLeakage,
    checkWindowAlert,
    checkProviderMemoization,
    checkFirestoreLimit,
    checkEslintDisableAbuse,
    checkSWRPolling,
    checkServiceFirestoreLimit,
    checkAuthOrdering,
    checkErrorInterpolationInHandler,
    checkUserIdPriorityInversion,
    checkAccessibilityBasics,
    checkFormControlledInputs
};
