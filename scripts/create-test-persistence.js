#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Utility script to create test-persistence.txt in the application root directory.
 * This is used to test and verify filesystem persistence in the AI Studio environment.
 */
const rootDir = process.cwd();
const targetPath = path.resolve(rootDir, 'test-persistence.txt');

const now = new Date();
const fileContent = [
  '=== TELZO CLOUD PERSISTENCE TEST FILE ===',
  `Created At: ${now.toISOString()}`,
  `Created Locale: ${now.toLocaleString()}`,
  `Platform: ${os.platform()} (${os.arch()})`,
  `Node.js: ${process.version}`,
  `Hostname: ${os.hostname()}`,
  `Process PID: ${process.pid}`,
  `Working Directory: ${rootDir}`,
  'Status: ACTIVE',
  'Description: This file verifies whether files created in the sandbox root directory persist across dev server restarts, container lifecycles, and browser refreshes.',
  '=========================================',
].join('\n');

try {
  fs.writeFileSync(targetPath, fileContent, 'utf8');
  console.log(`[TELZO CLOUD] Successfully created persistence test file at:\n  -> ${targetPath}`);
  console.log('\nFile contents:');
  console.log('--------------------------------------------------');
  console.log(fileContent);
  console.log('--------------------------------------------------');
  process.exit(0);
} catch (error) {
  console.error(`[TELZO CLOUD] Failed to create persistence file at ${targetPath}:`, error);
  process.exit(1);
}
