#!/usr/bin/env node
// Jurify — Cleanup build cache and temp files

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dirsToClean = ['dist', '.vite', 'coverage', 'playwright-report', 'node_modules/.vite'];

console.log('=== JURIFY CACHE CLEANUP ===\n');

for (const dir of dirsToClean) {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`  Removed ${dir}/`);
  }
}

// Clean temp files
const tmpPattern = /^tmpclaude-/;
function cleanTmpFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && tmpPattern.test(entry.name)) {
      fs.unlinkSync(path.join(dir, entry.name));
      console.log(`  Removed ${path.join(dir, entry.name).replace(ROOT, '')}`);
    }
  }
}
cleanTmpFiles(ROOT);
cleanTmpFiles(path.join(ROOT, 'src'));

console.log('\nCleanup complete.');
