import * as fs from "fs";
import * as path from "path";
import {
    ENVIRONMENTS,
    ValidationReport,
    log,
    initializeApp,
    validateCollections,
    validateSystemDocuments,
    validateSubcollections,
    validateFirestoreRules,
    validateFirestoreIndexes
} from "./env-sync-lib";

// ALL collections to audit (comprehensive list)
const ALL_COLLECTIONS = [
    "users",
    "resumes",
    "allResumes",
    "drafts",
    "notifications",
    "system",
    "resumeProfiles",
    "analytics",
    "accessRequests",
    "conversations",
    "messages",
    "monitoring",
];

// System documents with expected fields
const SYSTEM_DOCUMENTS = [
    {
        path: "system/resumeIdCounter",
        requiredFields: ["currentId"],
        ignoredFields: ["nextId", "migrationNote", "migratedAt"],
    },
    {
        path: "system/billing",
        requiredFields: [],
        ignoredFields: [],
    },
    {
        path: "system/stats",
        requiredFields: [],
        ignoredFields: [],
    },
];

// Subcollections that must exist
const EXPECTED_SUBCOLLECTIONS: Record<string, { name: string; minCount: number }[]> = {
    "system/resumeIdCounter": [{ name: "shards", minCount: 16 }],
};

const IS_CI = process.argv.includes("--ci");



// ============================================================================
// Main Execution
// ============================================================================

async function main() {
    const PROJECT_ROOT = process.cwd();
    log("Starting Environment Sync Validation...", "info", IS_CI);

    const devApp = initializeApp(ENVIRONMENTS.dev, "dev");
    const prodApp = initializeApp(ENVIRONMENTS.prod, "prod");

    if (!devApp || !prodApp) {
        log("Failed to initialize Firebase apps", "error", IS_CI);
        process.exit(1);
    }

    const devDb = devApp.firestore();
    const prodDb = prodApp.firestore();

    const results = [
        ...(await validateCollections(devDb, prodDb, ALL_COLLECTIONS)),
        ...(await validateSystemDocuments(devDb, prodDb, SYSTEM_DOCUMENTS)),
        ...(await validateSubcollections(devDb, prodDb, EXPECTED_SUBCOLLECTIONS)),
        ...(await validateFirestoreRules(PROJECT_ROOT)),
        ...(await validateFirestoreIndexes(PROJECT_ROOT)),
    ];

    const summary = {
        total: results.length,
        passed: results.filter(r => r.status === "pass").length,
        warnings: results.filter(r => r.status === "warn").length,
        failures: results.filter(r => r.status === "fail").length,
    };

    const report: ValidationReport = {
        timestamp: new Date().toISOString(),
        results,
        summary,
    };

    // Print Results
    results.forEach(r => {
        const type = r.status === "pass" ? "success" : r.status === "warn" ? "warn" : "error";
        log(`[${r.category}] ${r.check}: ${r.message}`, type, IS_CI);
    });

    log(`Summary: ${summary.passed}/${summary.total} passed, ${summary.warnings} warnings, ${summary.failures} failures`, summary.failures > 0 ? "error" : summary.warnings > 0 ? "warn" : "success", IS_CI);

    const reportPath = path.resolve(process.cwd(), "docs/environment-sync-report.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    await Promise.all([devApp.delete(), prodApp.delete()]);
    process.exit(summary.failures > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
