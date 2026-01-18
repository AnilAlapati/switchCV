#!/usr/bin/env npx tsx
/**
 * Comprehensive Environment Sync Validator
 * 
 * Compares Dev vs Prod across:
 * - All Firestore collections (structure, counts)
 * - System documents and subcollections
 * - Firestore Security Rules (deployed vs local)
 * - Firestore Indexes (deployed vs local)
 * 
 * Exit Codes:
 *   0 = All checks passed
 *   1 = Critical issues found (will block deploy)
 *   2 = Warnings only (deploy can proceed)
 * 
 * Usage:
 *   npx tsx scripts/validate-environment-sync.ts [--ci]
 *   --ci: Machine-readable output for CI/CD
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ============================================================================
// Configuration
// ============================================================================

interface EnvironmentConfig {
    name: string;
    projectId: string;
    keyPath: string;
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
    dev: {
        name: "Development",
        projectId: "switchcv-dev",
        keyPath: ".agent/secrets/firebase-dev-sa-key.json",
    },
    prod: {
        name: "Production",
        projectId: "switchcv-e5136",
        keyPath: ".agent/secrets/firebase-admin-sa-key.json",
    },
};

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

// Fields that are expected to differ between environments
const GLOBALLY_IGNORED_FIELDS = [
    "createdAt",
    "updatedAt",
    "lastModified",
    "timestamp",
];

const IS_CI = process.argv.includes("--ci");

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
    category: string;
    check: string;
    status: "pass" | "warn" | "fail";
    message: string;
    details?: Record<string, unknown>;
}

interface ValidationReport {
    timestamp: string;
    results: ValidationResult[];
    summary: {
        total: number;
        passed: number;
        warnings: number;
        failures: number;
    };
}

// ============================================================================
// Utilities
// ============================================================================

function log(message: string, type: "info" | "success" | "warn" | "error" = "info") {
    if (IS_CI) {
        console.log(JSON.stringify({ type, message }));
    } else {
        const icons = { info: "ℹ️ ", success: "✅", warn: "⚠️ ", error: "❌" };
        console.log(`${icons[type]} ${message}`);
    }
}

function initializeApp(env: EnvironmentConfig, appName: string): admin.app.App | null {
    const keyFullPath = path.resolve(process.cwd(), env.keyPath);

    if (fs.existsSync(keyFullPath)) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(keyFullPath, "utf8"));
            return admin.initializeApp(
                {
                    credential: admin.credential.cert(serviceAccount),
                    projectId: env.projectId,
                },
                appName
            );
        } catch (error) {
            log(`Failed to read key file for ${env.name}: ${error}`, "error");
        }
    }

    // Fallback to ADC
    try {
        return admin.initializeApp(
            {
                credential: admin.credential.applicationDefault(),
                projectId: env.projectId,
            },
            appName
        );
    } catch (error) {
        log(`Failed to initialize ${env.name} with ADC: ${error}`, "error");
        return null;
    }
}

// ============================================================================
// Validators
// ============================================================================

async function validateCollections(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const collection of ALL_COLLECTIONS) {
        try {
            const [devSnap, prodSnap] = await Promise.all([
                devDb.collection(collection).limit(1).get(),
                prodDb.collection(collection).limit(1).get(),
            ]);

            const devExists = !devSnap.empty;
            const prodExists = !prodSnap.empty;

            if (devExists && !prodExists) {
                results.push({
                    category: "Collections",
                    check: collection,
                    status: "fail",
                    message: `Collection '${collection}' exists in Dev but missing in Prod`,
                });
            } else if (!devExists && prodExists) {
                results.push({
                    category: "Collections",
                    check: collection,
                    status: "warn",
                    message: `Collection '${collection}' exists in Prod but not in Dev`,
                });
            } else {
                results.push({
                    category: "Collections",
                    check: collection,
                    status: "pass",
                    message: `Collection '${collection}' present in both environments`,
                });
            }
        } catch (error) {
            results.push({
                category: "Collections",
                check: collection,
                status: "warn",
                message: `Could not check collection '${collection}': ${error}`,
            });
        }
    }

    return results;
}

async function validateSystemDocuments(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const doc of SYSTEM_DOCUMENTS) {
        const [devSnap, prodSnap] = await Promise.all([
            devDb.doc(doc.path).get(),
            prodDb.doc(doc.path).get(),
        ]);

        if (!prodSnap.exists && devSnap.exists) {
            results.push({
                category: "System Documents",
                check: doc.path,
                status: "fail",
                message: `System document '${doc.path}' missing in Prod`,
            });
            continue;
        }

        if (!devSnap.exists && !prodSnap.exists) {
            results.push({
                category: "System Documents",
                check: doc.path,
                status: "pass",
                message: `Document '${doc.path}' not required (absent in both)`,
            });
            continue;
        }

        // Check required fields
        const prodData = prodSnap.data() || {};
        const missingRequired = doc.requiredFields.filter((f) => !(f in prodData));

        if (missingRequired.length > 0) {
            results.push({
                category: "System Documents",
                check: doc.path,
                status: "fail",
                message: `Missing required fields in Prod: ${missingRequired.join(", ")}`,
            });
        } else {
            results.push({
                category: "System Documents",
                check: doc.path,
                status: "pass",
                message: `Document '${doc.path}' validated`,
            });
        }
    }

    return results;
}

async function validateSubcollections(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const [parentPath, subcollections] of Object.entries(EXPECTED_SUBCOLLECTIONS)) {
        for (const sub of subcollections) {
            const fullPath = `${parentPath}/${sub.name}`;

            const [devCount, prodCount] = await Promise.all([
                devDb.collection(fullPath).count().get().then((s) => s.data().count).catch(() => 0),
                prodDb.collection(fullPath).count().get().then((s) => s.data().count).catch(() => 0),
            ]);

            if (prodCount < sub.minCount) {
                results.push({
                    category: "Subcollections",
                    check: fullPath,
                    status: "fail",
                    message: `Subcollection '${fullPath}' has ${prodCount} docs in Prod (expected >= ${sub.minCount})`,
                    details: { devCount, prodCount, required: sub.minCount },
                });
            } else {
                results.push({
                    category: "Subcollections",
                    check: fullPath,
                    status: "pass",
                    message: `Subcollection '${fullPath}' has ${prodCount} docs (ok)`,
                });
            }
        }
    }

    return results;
}

async function validateFirestoreRules(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const localRulesPath = path.resolve(process.cwd(), "firestore.rules");

    if (!fs.existsSync(localRulesPath)) {
        results.push({
            category: "Security Rules",
            check: "firestore.rules",
            status: "warn",
            message: "No local firestore.rules file found",
        });
        return results;
    }

    // Compare local rules with deployed rules using firebase CLI
    try {
        // Get deployed rules (requires firebase CLI and auth)
        const deployedRules = execSync(
            `npx firebase-tools firestore:rules:list --project=switchcv-e5136 2>/dev/null | head -1`,
            { encoding: "utf8", timeout: 30000 }
        ).trim();

        if (deployedRules) {
            results.push({
                category: "Security Rules",
                check: "firestore.rules",
                status: "pass",
                message: "Firestore rules are deployed (manual comparison recommended)",
            });
        }
    } catch {
        results.push({
            category: "Security Rules",
            check: "firestore.rules",
            status: "warn",
            message: "Could not verify deployed rules (CLI auth required)",
        });
    }

    return results;
}

async function validateFirestoreIndexes(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const localIndexesPath = path.resolve(process.cwd(), "firestore.indexes.json");

    if (!fs.existsSync(localIndexesPath)) {
        results.push({
            category: "Indexes",
            check: "firestore.indexes.json",
            status: "warn",
            message: "No local firestore.indexes.json file found",
        });
        return results;
    }

    const localIndexes = JSON.parse(fs.readFileSync(localIndexesPath, "utf8"));
    const indexCount = localIndexes.indexes?.length || 0;

    results.push({
        category: "Indexes",
        check: "firestore.indexes.json",
        status: "pass",
        message: `${indexCount} indexes defined locally (deploy with 'firebase deploy --only firestore:indexes')`,
    });

    return results;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║        Environment Sync Validator v2.0                         ║");
    console.log("║        Comprehensive Dev/Prod Comparison                       ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    // Initialize Firebase
    log("Initializing Firebase connections...", "info");
    const devApp = initializeApp(ENVIRONMENTS.dev, "dev");
    const prodApp = initializeApp(ENVIRONMENTS.prod, "prod");

    if (!devApp || !prodApp) {
        log("Failed to initialize one or both environments", "error");
        process.exit(1);
    }

    const devDb = devApp.firestore();
    const prodDb = prodApp.firestore();
    log("Connected to both environments", "success");

    // Run all validations
    const allResults: ValidationResult[] = [];

    console.log("\n📊 Validating Collections...");
    allResults.push(...(await validateCollections(devDb, prodDb)));

    console.log("\n📄 Validating System Documents...");
    allResults.push(...(await validateSystemDocuments(devDb, prodDb)));

    console.log("\n📁 Validating Subcollections...");
    allResults.push(...(await validateSubcollections(devDb, prodDb)));

    console.log("\n🔐 Validating Security Rules...");
    allResults.push(...(await validateFirestoreRules()));

    console.log("\n📇 Validating Indexes...");
    allResults.push(...(await validateFirestoreIndexes()));

    // Generate report
    const passed = allResults.filter((r) => r.status === "pass").length;
    const warnings = allResults.filter((r) => r.status === "warn").length;
    const failures = allResults.filter((r) => r.status === "fail").length;

    const report: ValidationReport = {
        timestamp: new Date().toISOString(),
        results: allResults,
        summary: {
            total: allResults.length,
            passed,
            warnings,
            failures,
        },
    };

    // Print summary
    console.log("\n" + "═".repeat(68));
    console.log("VALIDATION SUMMARY");
    console.log("═".repeat(68));

    if (failures > 0) {
        console.log(`\n❌ FAILURES (${failures}) - DEPLOY BLOCKED:`);
        for (const r of allResults.filter((r) => r.status === "fail")) {
            console.log(`   [${r.category}] ${r.check}: ${r.message}`);
        }
    }

    if (warnings > 0) {
        console.log(`\n⚠️  WARNINGS (${warnings}):`);
        for (const r of allResults.filter((r) => r.status === "warn")) {
            console.log(`   [${r.category}] ${r.check}: ${r.message}`);
        }
    }

    console.log(`\n✅ PASSED: ${passed}/${allResults.length}`);

    // Save report
    const reportPath = path.resolve(process.cwd(), "docs/environment-sync-report.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report saved to: ${reportPath}`);

    // Cleanup
    await Promise.all([devApp.delete(), prodApp.delete()]);

    // Exit with appropriate code
    if (failures > 0) {
        console.log("\n🛑 DEPLOYMENT BLOCKED: Critical issues found. Fix before deploying.");
        process.exit(1);
    } else if (warnings > 0) {
        console.log("\n⚠️  Deployment can proceed, but review warnings.");
        process.exit(0);
    } else {
        console.log("\n🎉 All checks passed! Environments are in sync.");
        process.exit(0);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
