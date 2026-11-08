const fs = require('fs');
const path = require('path');

function fixFileLinks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  const relToDocs = path.relative('docs', filePath);
  const depth = relToDocs.split(path.sep).length - 1; // 0 for docs/FILE.md, 1 for docs/sub/FILE.md, 2 for docs/sub/sub/FILE.md

  if (filePath.startsWith('docs' + path.sep)) {
    if (depth === 0) {
      // Inside docs/ root
      content = content.replace(/\(\.\/docs\//g, '(./');
    } else if (depth === 1) {
      // Inside docs/subdir/
      content = content.replace(/\(\.\/docs\//g, '(../');
      content = content.replace(/\(\.\.\/docs\//g, '(../');
    } else if (depth === 2) {
      // Inside docs/subdir/subsubdir/
      content = content.replace(/\(\.\/docs\//g, '(../../');
      content = content.replace(/\(\.\.\/\.\.\/docs\//g, '(../../');
    }
  }

  // Update repository URL
  content = content.replace(/github\.com\/noorulahamed\/aegis-ai/gi, 'github.com/NoorulAhameddev/AegisAi');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated links in: ${filePath}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.agents') continue;
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      fixFileLinks(full);
    }
  }
}

walk('docs');
if (fs.existsSync('README.md')) fixFileLinks('README.md');
console.log('Finished fixing doc links.');
