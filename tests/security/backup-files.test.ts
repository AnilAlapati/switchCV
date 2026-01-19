/**
 * Security test: Ensure no backup files are committed to git
 * This prevents accidental credential exposure
 * Run: npm run test:security
 */

import { execSync } from 'child_process';

describe('Security: Backup File Protection', () => {
  test('should not have backup files in git tracking', () => {
    try {
      const trackedFiles = execSync('git ls-files').toString().split('\n').filter(f => f);
      const backupFiles = trackedFiles.filter(file =>
        /-backup|-secret|\.env\.local\./.test(file) &&
        !file.includes('.gitignore') &&
        !file.includes('docs/')
      );

      if (backupFiles.length > 0) {
        throw new Error(`Found backup files in git: ${backupFiles.join(', ')}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a git repository')) {
        // Skip if not in git repo
        return;
      }
      throw error;
    }
  });

  test('should have backup exclusion patterns in gitignore', () => {
    const fs = require('fs');
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    
    const requiredPatterns = [
      '.env.local.*-backup',
      '.env-backups/'
    ];

    const missingPatterns = requiredPatterns.filter(pattern => !gitignore.includes(pattern));
    
    if (missingPatterns.length > 0) {
      throw new Error(`Missing .gitignore patterns: ${missingPatterns.join(', ')}`);
    }
  });
});
