#!/usr/bin/env node
/**
 * Environment Comparison Script
 * 
 * Compares Firestore structure between dev and prod to detect schema drift.
 * Does NOT compare data, only validates that expected collections and documents exist.
 * 
 * Usage:
 *   node scripts/compare-environments.js
 * 
 * Prerequisites:
 *   - firebase_config_dev_backup.json and firebase_config_prod_backup.json exist
 *   - OR GOOGLE_APPLICATION_CREDENTIALS_DEV and GOOGLE_APPLICATION_CREDENTIALS_PROD env vars
 */

const admin = require('firebase-admin');

// Expected schema definition
const EXPECTED_SCHEMA = {
    collections: [
        'users',
        'resumes',
        'drafts',
        'notifications',
        'analytics',
        'auditLogs',
        'recruiterMetrics',
        'jobSeekerMetrics',
        'recruiterSearchHistory',
    ],
    systemDocuments: [
        { path: 'system/resumeIdCounter', requiredFields: ['createdAt'] },
        { path: 'system/billing', requiredFields: [] },
        { path: 'config/system', requiredFields: [] },
    ],
    expectedShards: {
        path: 'system/resumeIdCounter/shards',
        count: 16,
    },
};

class EnvironmentChecker {
    constructor(app, name) {
        this.db = app.firestore();
        this.name = name;
        this.issues = [];
        this.warnings = [];
    }

    async checkCollectionExists(collectionName) {
        try {
            const snapshot = await this.db.collection(collectionName).limit(1).get();
            return { exists: true, hasDocuments: !snapshot.empty };
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }

    async checkDocumentExists(docPath, requiredFields = []) {
        try {
            const doc = await this.db.doc(docPath).get();
            if (!doc.exists) {
                return { exists: false };
            }
            const data = doc.data();
            const missingFields = requiredFields.filter(field => !(field in data));
            return { exists: true, data, missingFields };
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }

    async checkShards(shardPath, expectedCount) {
        try {
            const snapshot = await this.db.collection(shardPath).get();
            return {
                exists: !snapshot.empty,
                count: snapshot.size,
                expected: expectedCount,
                match: snapshot.size === expectedCount,
            };
        } catch (error) {
            return { exists: false, count: 0, expected: expectedCount, error: error.message };
        }
    }

    async runAllChecks() {
        console.log(`\n=== Checking ${this.name} ===\n`);

        // Check collections
        console.log('Collections:');
        for (const collection of EXPECTED_SCHEMA.collections) {
            const result = await this.checkCollectionExists(collection);
            const status = result.exists
                ? (result.hasDocuments ? '✓' : '⚠ (empty)')
                : '✗';
            console.log(`  ${status} ${collection}`);

            if (!result.exists) {
                this.issues.push(`Missing collection: ${collection}`);
            } else if (!result.hasDocuments) {
                this.warnings.push(`Empty collection: ${collection}`);
            }
        }

        // Check system documents
        console.log('\nSystem Documents:');
        for (const doc of EXPECTED_SCHEMA.systemDocuments) {
            const result = await this.checkDocumentExists(doc.path, doc.requiredFields);
            let status = result.exists ? '✓' : '✗';
            if (result.exists && result.missingFields?.length > 0) {
                status = '⚠';
            }
            console.log(`  ${status} ${doc.path}`);

            if (!result.exists) {
                this.issues.push(`Missing document: ${doc.path}`);
            } else if (result.missingFields?.length > 0) {
                this.warnings.push(`Document ${doc.path} missing fields: ${result.missingFields.join(', ')}`);
            }
        }

        // Check shards
        console.log('\nSharded Counters:');
        const shardResult = await this.checkShards(
            EXPECTED_SCHEMA.expectedShards.path,
            EXPECTED_SCHEMA.expectedShards.count
        );
        const shardStatus = shardResult.match ? '✓' : '✗';
        console.log(`  ${shardStatus} ${EXPECTED_SCHEMA.expectedShards.path}: ${shardResult.count}/${shardResult.expected} shards`);

        if (!shardResult.match) {
            this.issues.push(
                `Shard count mismatch at ${EXPECTED_SCHEMA.expectedShards.path}: got ${shardResult.count}, expected ${shardResult.expected}`
            );
        }

        return {
            name: this.name,
            issues: this.issues,
            warnings: this.warnings,
            healthy: this.issues.length === 0,
        };
    }
}

async function initializeApps() {
    const apps = {};

    // Try to initialize dev
    try {
        const devApp = admin.initializeApp({
            projectId: 'switchcv-dev',
        }, 'dev');
        apps.dev = devApp;
        console.log('✓ Connected to switchcv-dev');
    } catch (error) {
        console.warn('⚠ Could not connect to dev:', error.message);
    }

    // Try to initialize prod
    try {
        const prodApp = admin.initializeApp({
            projectId: 'switchcv-e5136',
        }, 'prod');
        apps.prod = prodApp;
        console.log('✓ Connected to switchcv-e5136 (prod)');
    } catch (error) {
        console.warn('⚠ Could not connect to prod:', error.message);
    }

    return apps;
}

async function main() {
    console.log('=== Environment Comparison Tool ===');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    const apps = await initializeApps();

    if (Object.keys(apps).length === 0) {
        console.error('No environments could be connected. Check your credentials.');
        process.exit(1);
    }

    const results = [];

    for (const [envName, app] of Object.entries(apps)) {
        const checker = new EnvironmentChecker(app, envName);
        const result = await checker.runAllChecks();
        results.push(result);
    }

    // Summary
    console.log('\n=== Summary ===\n');

    for (const result of results) {
        const healthStatus = result.healthy ? '✅ HEALTHY' : '❌ ISSUES FOUND';
        console.log(`${result.name}: ${healthStatus}`);

        if (result.issues.length > 0) {
            console.log('  Issues:');
            result.issues.forEach(issue => console.log(`    - ${issue}`));
        }

        if (result.warnings.length > 0) {
            console.log('  Warnings:');
            result.warnings.forEach(warning => console.log(`    - ${warning}`));
        }
    }

    // Comparison
    if (results.length === 2) {
        console.log('\n=== Drift Detection ===\n');
        const [env1, env2] = results;
        const allIssues = new Set([...env1.issues, ...env2.issues]);

        const driftDetected = env1.issues.length !== env2.issues.length ||
            [...allIssues].some(issue =>
                env1.issues.includes(issue) !== env2.issues.includes(issue)
            );

        if (driftDetected) {
            console.log('⚠️  DRIFT DETECTED between environments!');
            console.log('Review the issues above and synchronize the environments.');
        } else {
            console.log('✅ No drift detected. Environments have consistent structure.');
        }
    }

    // Exit with error if any environment has issues
    const hasIssues = results.some(r => !r.healthy);
    process.exit(hasIssues ? 1 : 0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
