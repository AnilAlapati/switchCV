import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import {
    ENVIRONMENTS,
    initializeApp,
    getCollectionCount,
    collectionExists,
    documentExists,
    subcollectionExists
} from './env-sync-lib';

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
const SYSTEM_DOCUMENTS: Array<{ path: string; requiredFields: string[]; ignoredFields: string[] }> = [
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
// Report Generation Helpers
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


        const ignored = doc.ignoredFields || [];
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
