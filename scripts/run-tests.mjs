#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, 'apps', 'web');

// Run specific test
const testName = process.argv[2] || 'encryption';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const proc = spawn(npm, ['test', '--', testName], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true,
});

proc.on('exit', (code) => {
  process.exit(code);
});

proc.on('error', (err) => {
  console.error('Error running tests:', err);
  process.exit(1);
});
