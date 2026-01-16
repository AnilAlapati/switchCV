
import { runMigrations } from "../src/lib/db/migrations";
import { initializeFirebaseAdmin } from "../src/lib/firebase-admin";

// Ensure Env is loaded (e.g. via dotenv if running locally, or environment)
// In this project, scripts/dev-with-secrets.sh handles env loading usually.
// But valid environment variables are needed.

async function main() {
    initializeFirebaseAdmin();
    await runMigrations();
}

main().catch(console.error);
