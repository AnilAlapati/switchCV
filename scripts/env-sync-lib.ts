import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ============================================================================
// Configuration & Types
// ============================================================================

export interface EnvironmentConfig {
    name: string;
    projectId: string;
    keyPath: string;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
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

export interface ValidationResult {
    category: string;
    check: string;
    status: "pass" | "warn" | "fail";
    message: string;
    details?: Record<string, unknown>;
}

export interface ValidationReport {
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

export function log(message: string, type: "info" | "success" | "warn" | "error" = "info", isCI: boolean = false) {
    if (isCI) {
        console.log(JSON.stringify({ type, message }));
    } else {
        const icons = { info: "ℹ️ ", success: "✅", warn: "⚠️ ", error: "❌" };
        console.log(`${icons[type]} ${message}`);
    }
}

export function initializeApp(env: EnvironmentConfig, appName: string): admin.app.App | null {
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
            console.error(`Failed to read key file for ${env.name}: ${error}`);
        }
    }

    try {
        return admin.initializeApp(
            {
                credential: admin.credential.applicationDefault(),
                projectId: env.projectId,
            },
            appName
        );
    } catch (error) {
        console.error(`Failed to initialize ${env.name} with ADC: ${error}`);
        return null;
    }
}

// ============================================================================
// Shared Validators
// ============================================================================

export async function validateCollections(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore,
    collections: string[]
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    for (const collection of collections) {
        try {
            const [devSnap, prodSnap] = await Promise.all([
                devDb.collection(collection).limit(1).get(),
                prodDb.collection(collection).limit(1).get(),
            ]);
            if (devSnap.empty && !prodSnap.empty) {
                results.push({ category: "Collections", check: collection, status: "warn", message: `In Prod but not Dev` });
            } else if (!devSnap.empty && prodSnap.empty) {
                results.push({ category: "Collections", check: collection, status: "fail", message: `Missing in Prod` });
            } else {
                results.push({ category: "Collections", check: collection, status: "pass", message: `Validated` });
            }
        } catch (error) {
            results.push({ category: "Collections", check: collection, status: "warn", message: `Error: ${error}` });
        }
    }
    return results;
}

export async function validateSystemDocuments(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore,
    documents: Array<{ path: string; requiredFields: string[]; ignoredFields: string[] }>
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    for (const doc of documents) {
        const [devSnap, prodSnap] = await Promise.all([devDb.doc(doc.path).get(), prodDb.doc(doc.path).get()]);
        if (!prodSnap.exists && devSnap.exists) {
            results.push({ category: "System Documents", check: doc.path, status: "fail", message: `Missing in Prod` });
        } else if (prodSnap.exists) {
            const prodData = prodSnap.data() || {};
            const missing = doc.requiredFields.filter(f => !(f in prodData));
            if (missing.length > 0) {
                results.push({ category: "System Documents", check: doc.path, status: "fail", message: `Missing fields: ${missing.join(", ")}` });
            } else {
                results.push({ category: "System Documents", check: doc.path, status: "pass", message: `Validated` });
            }
        }
    }
    return results;
}

export async function validateSubcollections(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore,
    expectedSubcollections: Record<string, { name: string; minCount: number }[]>
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    for (const [parentPath, subcollections] of Object.entries(expectedSubcollections)) {
        for (const sub of subcollections) {
            const fullPath = `${parentPath}/${sub.name}`;
            try {
                const [, prodCount] = await Promise.all([
                    devDb.collection(fullPath).count().get().then((s) => s.data().count).catch(() => 0),
                    prodDb.collection(fullPath).count().get().then((s) => s.data().count).catch(() => 0),
                ]);
                if (prodCount < sub.minCount) {
                    results.push({ category: "Subcollections", check: fullPath, status: "fail", message: `Count ${prodCount} < ${sub.minCount}` });
                } else {
                    results.push({ category: "Subcollections", check: fullPath, status: "pass", message: `Validated (${prodCount})` });
                }
            } catch {
                results.push({ category: "Subcollections", check: fullPath, status: "warn", message: `Error checking count` });
            }
        }
    }
    return results;
}

export async function validateFirestoreRules(projectRoot: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const localRulesPath = path.resolve(projectRoot, "firestore.rules");
    if (!fs.existsSync(localRulesPath)) {
        results.push({ category: "Security Rules", check: "firestore.rules", status: "warn", message: "No local rules found" });
        return results;
    }
    try {
        const deployedRules = execSync(`npx firebase-tools firestore:rules:list --project=switchcv-e5136 2>/dev/null | head -1`, { encoding: "utf8", timeout: 30000 }).trim();
        if (deployedRules) results.push({ category: "Security Rules", check: "firestore.rules", status: "pass", message: "Rules deployed" });
    } catch {
        results.push({ category: "Security Rules", check: "firestore.rules", status: "warn", message: "Could not verify deployed rules" });
    }
    return results;
}

export async function validateFirestoreIndexes(projectRoot: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const localIndexesPath = path.resolve(projectRoot, "firestore.indexes.json");
    if (!fs.existsSync(localIndexesPath)) {
        results.push({ category: "Indexes", check: "firestore.indexes.json", status: "warn", message: "No local indexes found" });
        return results;
    }
    const localIndexes = JSON.parse(fs.readFileSync(localIndexesPath, "utf8"));
    const count = localIndexes.indexes?.length || 0;
    results.push({ category: "Indexes", check: "firestore.indexes.json", status: "pass", message: `${count} indexes defined` });
    return results;
}

export async function getCollectionCount(db: admin.firestore.Firestore, collectionName: string): Promise<number> {
    try {
        const snapshot = await db.collection(collectionName).count().get();
        return snapshot.data().count;
    } catch {
        return -1;
    }
}

export async function collectionExists(db: admin.firestore.Firestore, collectionName: string): Promise<boolean> {
    try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        return !snapshot.empty;
    } catch {
        return false;
    }
}

export async function documentExists(db: admin.firestore.Firestore, docPath: string): Promise<{ exists: boolean; fields: string[] }> {
    try {
        const doc = await db.doc(docPath).get();
        if (doc.exists) {
            return { exists: true, fields: Object.keys(doc.data() || {}) };
        }
        return { exists: false, fields: [] };
    } catch {
        return { exists: false, fields: [] };
    }
}

export async function subcollectionExists(
    db: admin.firestore.Firestore,
    parentPath: string,
    subcollection: string
): Promise<{ exists: boolean; count: number }> {
    try {
        const snapshot = await db.collection(`${parentPath}/${subcollection}`).limit(1).get();
        if (snapshot.empty) {
            return { exists: false, count: 0 };
        }
        const countSnapshot = await db.collection(`${parentPath}/${subcollection}`).count().get();
        return { exists: true, count: countSnapshot.data().count };
    } catch {
        return { exists: false, count: 0 };
    }
}
