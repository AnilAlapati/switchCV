const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const releaseNotesPath = path.join(__dirname, '../docs/RELEASE_NOTES.md');

// Read package.json
const packageJson = require(packageJsonPath);
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);

// Increment patch version
versionParts[2] += 1;
const newVersion = versionParts.join('.');

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Updated version from ${currentVersion} to ${newVersion}`);

// Update RELEASE_NOTES.md
const date = new Date().toISOString().split('T')[0];
const newReleaseEntry = `
## [AI.${newVersion}] - ${date}
### Changed
- Automated version increment.
`;

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
// Insert after the header
const updatedReleaseNotes = releaseNotes.replace('# Release Notes\n', `# Release Notes\n${newReleaseEntry}`);

fs.writeFileSync(releaseNotesPath, updatedReleaseNotes);
console.log(`Updated RELEASE_NOTES.md`);
