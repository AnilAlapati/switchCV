const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src/app');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

console.log("🔍 Starting Performance Standards Audit...");

let violations = [];

walkDir(SRC_DIR, (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(SRC_DIR, filePath);

    // 1. Check API Routes (GET) for Cache-Control
    if (filePath.includes('/api/') && filePath.endsWith('route.ts')) {
        if (content.includes('export async function GET') || content.includes('export const GET')) {
            if (!content.includes('Cache-Control')) {
                violations.push(`[API] Missing Cache-Control: ${relativePath}`);
            }
        }
    }

    // 2. Check Pages for Manual Fetching Pattern
    if (filePath.endsWith('page.tsx')) {
        // Skip auth pages and root page
        if (relativePath.startsWith('auth') || relativePath === 'page.tsx') return;

        // Regex to find useEffect containing fetch
        // Simple heuristic: if file has both 'useEffect' and 'fetch'
        if (content.includes('useEffect') && content.includes('fetch(')) {
            // Look closer: simple string check might trigger on custom hooks implementation (false positive)
            // But Page components should NOT implement fetch logic.
            violations.push(`[Page] Potential Manual Fetch: ${relativePath} (Use SWR hook instead)`);
        }
    }
});

if (violations.length > 0) {
    console.error(`\n❌ Found ${violations.length} violations:`);
    violations.forEach(v => console.error(` - ${v}`));
    console.log("\nPlease refer to docs/PERFORMANCE_STANDARDS.md for fixes.\n");
    process.exit(1);
} else {
    console.log("\n✅ All Performance Standards Checks Passed!");
}
