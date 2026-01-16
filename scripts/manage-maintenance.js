const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Verify Project ID
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error('❌ Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in .env.local');
    process.exit(1);
}

// Parse arguments: "on" or "off"
const mode = process.argv[2]?.toLowerCase();
if (mode !== 'on' && mode !== 'off' && mode !== 'status') {
    console.log('Usage: node scripts/manage-maintenance.js [on|off|status]');
    process.exit(1);
}

console.log(`Initializing Firebase Admin for project: ${projectId}`);

// Initialize App
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            projectId: projectId,
            credential: admin.credential.applicationDefault(),
        });
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        process.exit(1);
    }
}

const db = admin.firestore();

async function manageMaintenance() {
    const configRef = db.collection('config').doc('system');

    try {
        const doc = await configRef.get();
        const current = doc.exists ? doc.data() : { maintenance: { isActive: false } };
        const isActive = current.maintenance?.isActive || false;

        console.log(`Current Status: ${isActive ? 'ON 🔴' : 'OFF 🟢'}`);

        if (mode === 'status') return;

        if (mode === 'on') {
            if (isActive) {
                console.log('✅ Already ON.');
            } else {
                console.log('Enabling Maintenance Mode...');
                await configRef.set({
                    maintenance: {
                        isActive: true,
                        message: "System is under maintenance. Please check back later.",
                        blocking: true,
                    }
                }, { merge: true });
                console.log('✅ Maintenance Mode ENABLED 🔴');
            }
        } else if (mode === 'off') {
            if (!isActive) {
                console.log('✅ Already OFF.');
            } else {
                console.log('Disabling Maintenance Mode...');
                await configRef.update({
                    'maintenance.isActive': false,
                    'maintenance.blocking': false
                });
                console.log('✅ Maintenance Mode DISABLED 🟢');
            }
        }
    } catch (error) {
        console.error('❌ Error updating database:', error);
        process.exit(1);
    }
}

manageMaintenance();
