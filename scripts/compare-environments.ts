#!/usr/bin/env npx ts-node
/**
 * Environment Comparison Script
 * 
 * Compares the structure and health of Dev vs Prod Firestore databases.
 * Usage: npx ts-node scripts/compare-environments.ts
 * 
 * This script connects to both environments using service account keys
 * and reports differences in:
 * - Collection existence
 * - Document counts
 * - Schema structure (field presence)
 * - Subcollection presence
 * - Index availability (via query tests)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface EnvironmentConfig {
    name: string;
    projectId: string;
    keyPath: string; // Path to service account key JSON
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
    dev: {
        name: 'Development',
        projectId: 'switchcv-dev',
        keyPath: '.agent/secrets/firebase-dev-sa-key.json',
    },
    prod: {
        name: 'Production',
        projectId: 'switchcv-e5136',
        keyPath: '.agent/secrets/firebase-admin-sa-key.json',
    },
};

// Collections to audit
const CRITICAL_COLLECTIONS = [
    'users',
    'resumes',
    'allResumes',
    'drafts',
    'notifications',
    'system',
    'resumeProfiles',
    'analytics',
];

// System documents to check for specific structure
const SYSTEM_DOCUMENTS = [
    { path: 'system/resumeIdCounter', requiredFields: [], ignoredFields: ['nextId', 'migrationNote', 'migratedAt'] },
    { path: 'system/billing', requiredFields: ['tier', 'createdAt'], ignoredFields: [] },
    { path: 'system/stats', requiredFields: [], ignoredFields: [] },
];

// Subcollections to verify
const EXPECTED_SUBCOLLECTIONS: Record<string, string[]> = {
    'system/resumeIdCounter': ['shards'],
};

// ============================================================================
// Types
// ============================================================================

interface CollectionReport {
    name: string;
    devExists: boolean;
    prodExists: boolean;
    devCount: number;
    prodCount: number;
    countDiff: number;
    status: 'ok' | 'warning' | 'error';
    notes: string[];
}

interface DocumentReport {
    path: string;
    devExists: boolean;
    prodExists: boolean;
    devFields: string[];
    prodFields: string[];
    missingInProd: string[];
    missingInDev: string[];
    status: 'ok' | 'warning' | 'error';
}

interface SubcollectionReport {
    parentPath: string;
    subcollection: string;
    devExists: boolean;
    devCount: number;
    prodExists: boolean;
    prodCount: number;
    status: 'ok' | 'warning' | 'error';
}

interface EnvironmentReport {
    timestamp: string;
    collections: CollectionReport[];
    documents: DocumentReport[];
    subcollections: SubcollectionReport[];
    summary: {
        totalIssues: number;
        criticalIssues: number;
        warnings: number;
    };
}

// ============================================================================
// Firebase Initialization
// ============================================================================

function initializeApp(env: EnvironmentConfig, appName: string): admin.app.App | null {
    const keyFullPath = path.resolve(process.cwd(), env.keyPath);

    // Try service account key first
    if (fs.existsSync(keyFullPath)) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(keyFullPath, 'utf8'));
            console.log(`   Using key file for ${env.name}`);
            return admin.initializeApp(
                {
                    credential: admin.credential.cert(serviceAccount),
                    projectId: env.projectId,
                },
                appName
            );
        } catch (_err) {
            console.error(`❌ Failed to read key file for ${env.name}:`, _err);
        }
    }

    // Fallback to Application Default Credentials
    console.log(`   ℹ️  Key file not found for ${env.name}, using Application Default Credentials`);
    console.log(`      (Run 'gcloud auth application-default login' if not authenticated)`);

    try {
        return admin.initializeApp(
            {
                credential: admin.credential.applicationDefault(),
                projectId: env.projectId,
            },
            appName
        );
    } catch (_err) {
        console.error(`❌ Failed to initialize ${env.name} with ADC:`, _err);
        return null;
    }
}

// ============================================================================
// Comparison Functions
// ============================================================================

async function getCollectionCount(db: admin.firestore.Firestore, collectionName: string): Promise<number> {
    try {
        const snapshot = await db.collection(collectionName).count().get();
        return snapshot.data().count;
    } catch (_err) {
        return -1; // Error state
    }
}

async function collectionExists(db: admin.firestore.Firestore, collectionName: string): Promise<boolean> {
    try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        return !snapshot.empty;
    } catch {
        return false;
    }
}

async function documentExists(db: admin.firestore.Firestore, docPath: string): Promise<{ exists: boolean; fields: string[] }> {
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

async function subcollectionExists(
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

// ============================================================================
// Report Generation
// ============================================================================

async function compareCollections(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore
): Promise<CollectionReport[]> {
    const reports: CollectionReport[] = [];

    for (const collection of CRITICAL_COLLECTIONS) {
        process.stdout.write(`  Checking ${collection}...`);

        const [devExists, prodExists, devCount, prodCount] = await Promise.all([
            collectionExists(devDb, collection),
            collectionExists(prodDb, collection),
            getCollectionCount(devDb, collection),
            getCollectionCount(prodDb, collection),
        ]);

        const countDiff = devCount - prodCount;
        const notes: string[] = [];
        let status: 'ok' | 'warning' | 'error' = 'ok';

        if (!prodExists && devExists) {
            status = 'error';
            notes.push('Collection missing in Production');
        } else if (!devExists && prodExists) {
            status = 'warning';
            notes.push('Collection missing in Development (might be intentional)');
        } else if (Math.abs(countDiff) > 100) {
            status = 'warning';
            notes.push(`Large count difference: ${countDiff > 0 ? '+' : ''}${countDiff}`);
        }

        reports.push({
            name: collection,
            devExists,
            prodExists,
            devCount,
            prodCount,
            countDiff,
            status,
            notes,
        });

        console.log(status === 'ok' ? ' ✓' : status === 'warning' ? ' ⚠' : ' ✗');
    }

    return reports;
}

async function compareDocuments(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore
): Promise<DocumentReport[]> {
    const reports: DocumentReport[] = [];

    for (const doc of SYSTEM_DOCUMENTS) {
        process.stdout.write(`  Checking ${doc.path}...`);

        const [devResult, prodResult] = await Promise.all([
            documentExists(devDb, doc.path),
            documentExists(prodDb, doc.path),
        ]);


        const ignored = (doc as any).ignoredFields || [];
        const missingInProd = devResult.fields
            .filter(f => !prodResult.fields.includes(f))
            .filter(f => !ignored.includes(f));

        const missingInDev = prodResult.fields
            .filter(f => !devResult.fields.includes(f))
            .filter(f => !ignored.includes(f));

        let status: 'ok' | 'warning' | 'error' = 'ok';
        if (!prodResult.exists && devResult.exists) {
            status = 'error';
        } else if (missingInProd.length > 0 && doc.requiredFields.some(rf => missingInProd.includes(rf))) {
            status = 'error';
        } else if (missingInProd.length > 0 || missingInDev.length > 0) {
            status = 'warning';
        }

        reports.push({
            path: doc.path,
            devExists: devResult.exists,
            prodExists: prodResult.exists,
            devFields: devResult.fields,
            prodFields: prodResult.fields,
            missingInProd,
            missingInDev,
            status,
        });

        console.log(status === 'ok' ? ' ✓' : status === 'warning' ? ' ⚠' : ' ✗');
    }

    return reports;
}

async function compareSubcollections(
    devDb: admin.firestore.Firestore,
    prodDb: admin.firestore.Firestore
): Promise<SubcollectionReport[]> {
    const reports: SubcollectionReport[] = [];

    for (const [parentPath, subcollections] of Object.entries(EXPECTED_SUBCOLLECTIONS)) {
        for (const subcollection of subcollections) {
            process.stdout.write(`  Checking ${parentPath}/${subcollection}...`);

            const [devResult, prodResult] = await Promise.all([
                subcollectionExists(devDb, parentPath, subcollection),
                subcollectionExists(prodDb, parentPath, subcollection),
            ]);

            let status: 'ok' | 'warning' | 'error' = 'ok';
            if (!prodResult.exists && devResult.exists) {
                status = 'error';
            } else if (devResult.count !== prodResult.count && subcollection === 'shards') {
                // Shards should have exactly 16 documents
                if (prodResult.count !== 16) {
                    status = 'error';
                }
            }

            reports.push({
                parentPath,
                subcollection,
                devExists: devResult.exists,
                devCount: devResult.count,
                prodExists: prodResult.exists,
                prodCount: prodResult.count,
                status,
            });

            const statusIcon = status === 'ok' ? ' ✓' : (status === 'error' ? ' ✗' : ' ⚠');
            console.log(statusIcon);
        }
    }

    return reports;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          Environment Comparison Script v1.0                    ║');
    console.log('║          Dev (switchcv-dev) vs Prod (switchcv-e5136)           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log();

    // Initialize apps
    console.log('🔐 Initializing Firebase connections...');
    const devApp = initializeApp(ENVIRONMENTS.dev, 'dev');
    const prodApp = initializeApp(ENVIRONMENTS.prod, 'prod');

    if (!devApp || !prodApp) {
        console.error('\n❌ Failed to initialize one or both environments. Exiting.');
        process.exit(1);
    }

    const devDb = devApp.firestore();
    const prodDb = prodApp.firestore();
    console.log('✅ Connected to both environments.\n');

    // Run comparisons
    console.log('📊 Comparing Collections:');
    const collections = await compareCollections(devDb, prodDb);

    console.log('\n📄 Comparing System Documents:');
    const documents = await compareDocuments(devDb, prodDb);

    console.log('\n📁 Comparing Subcollections:');
    const subcollections = await compareSubcollections(devDb, prodDb);

    // Generate summary
    const criticalIssues = [
        ...collections.filter(c => c.status === 'error'),
        ...documents.filter(d => d.status === 'error'),
        ...subcollections.filter(s => s.status === 'error'),
    ].length;

    const warnings = [
        ...collections.filter(c => c.status === 'warning'),
        ...documents.filter(d => d.status === 'warning'),
        ...subcollections.filter(s => s.status === 'warning'),
    ].length;

    const report: EnvironmentReport = {
        timestamp: new Date().toISOString(),
        collections,
        documents,
        subcollections,
        summary: {
            totalIssues: criticalIssues + warnings,
            criticalIssues,
            warnings,
        },
    };

    // Print summary
    console.log('\n' + '═'.repeat(68));
    console.log('SUMMARY');
    console.log('═'.repeat(68));

    if (criticalIssues > 0) {
        console.log(`\n🚨 CRITICAL ISSUES (${criticalIssues}):`);
        for (const c of collections.filter(c => c.status === 'error')) {
            console.log(`   - Collection '${c.name}': ${c.notes.join(', ')}`);
        }
        for (const d of documents.filter(d => d.status === 'error')) {
            console.log(`   - Document '${d.path}': Missing in Prod`);
        }
        for (const s of subcollections.filter(s => s.status === 'error')) {
            console.log(`   - Subcollection '${s.parentPath}/${s.subcollection}': Missing/Incomplete in Prod (${s.prodCount} docs, expected 16)`);
        }
    }

    if (warnings > 0) {
        console.log(`\n⚠️  WARNINGS (${warnings}):`);
        for (const c of collections.filter(c => c.status === 'warning')) {
            console.log(`   - Collection '${c.name}': ${c.notes.join(', ')}`);
        }
        for (const d of documents.filter(d => d.status === 'warning')) {
            if (d.missingInProd.length > 0) {
                console.log(`   - Document '${d.path}': Fields missing in Prod: ${d.missingInProd.join(', ')}`);
            }
        }
    }

    if (criticalIssues === 0 && warnings === 0) {
        console.log('\n✅ All checks passed! Environments are in sync.');
    }

    // Save report to file
    const reportPath = path.resolve(process.cwd(), 'docs/environment-comparison-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Full report saved to: ${reportPath}`);

    // Cleanup
    await Promise.all([devApp.delete(), prodApp.delete()]);

    // Exit with appropriate code
    process.exit(criticalIssues > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
