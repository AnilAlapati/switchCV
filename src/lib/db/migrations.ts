import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";

export interface Migration {
    id: string;
    description: string;
    up: () => Promise<void>;
    down?: () => Promise<void>;
}

const MIGRATIONS_COLLECTION = "system_migrations";

/**
 * Migration Runner
 * 
 * Usage:
 * 1. Define migrations in the registry array
 * 2. Run `await runMigrations()` in a script or startup job
 */

// Registry of all migrations (In a real app, these might be dynamic imports)
const MIGRATION_REGISTRY: Migration[] = [
    {
        id: "001_init_tracking",
        description: "Initialize migration tracking collection",
        up: async () => {
            logger.info("Initializing migration tracking...");
            // Nothing to do, the first write creates the collection
        }
    },
    // Add new migrations here
    // {
    //   id: "002_add_search_profile_field",
    //   description: "Backfill searchProfile field for existing resumes",
    //   up: async () => { ... }
    // }
];

export async function runMigrations() {
    logger.info("🚀 Starting database migrations...");

    try {
        // 1. Get executed migrations
        const executedSnap = await adminDb.collection(MIGRATIONS_COLLECTION).get();
        const executedIds = new Set(executedSnap.docs.map(doc => doc.id));

        // 2. Filter pending
        const pending = MIGRATION_REGISTRY.filter(m => !executedIds.has(m.id));

        if (pending.length === 0) {
            logger.info("✅ No pending migrations.");
            return;
        }

        logger.info(`Found ${pending.length} pending migrations.`);

        // 3. Execute sequentially
        for (const migration of pending) {
            logger.info(`Running migration: ${migration.id} - ${migration.description}`);

            try {
                await migration.up();

                // Record success
                await adminDb.collection(MIGRATIONS_COLLECTION).doc(migration.id).set({
                    id: migration.id,
                    description: migration.description,
                    executedAt: FieldValue.serverTimestamp(),
                    status: "success"
                });

                logger.info(`✅ Migration ${migration.id} completed.`);
            } catch (error) {
                logger.error({ err: error, migrationId: migration.id }, "❌ Migration failed");
                throw error; // Stop execution on failure
            }
        }

        logger.info("🎉 All migrations completed successfully.");
    } catch (error) {
        logger.error({ err: error }, "Migration process terminated with error");
        process.exit(1);
    }
}
