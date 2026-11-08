const fs = require('fs');
const path = require('path');

const MOJIBAKE_MAP = [
  ['ðŸ›¡ï¸ ', '🛡️ '],
  ['ðŸ›¡ï¸', '🛡️'],
  ['ðŸ“š', '📚'],
  ['ðŸš€', '🚀'],
  ['ðŸ”’', '🔒'],
  ['ðŸŽ¯', '🎯'],
  ['ðŸ’¡', '💡'],
  ['ðŸ§\xa0', '🧠'],
  ['ðŸ§', '🧠'],
  ['ðŸ‘¨â€\xa0ðŸ’¼', '👨‍💼'],
  ['ðŸ‘¨â€ ðŸ’¼', '👨‍💼'],
  ['ðŸ‘¨', '👨'],
  ['ðŸŽ¨', '🎨'],
  ['ðŸ“±', '📱'],
  ['ðŸ¤–', '🤖'],
  ['ðŸ“–', '📖'],
  ['ðŸ›\xa0ï¸ ', '🛠️ '],
  ['ðŸ›\xa0ï¸', '🛠️'],
  ['ðŸ›\xa0', '🛠️'],
  ['ðŸ“‹', '📋'],
  ['ðŸŽ‰', '🎉'],
  ['ðŸ ³', '🐳'],
  ['ðŸ —ï¸ ', '🏗️ '],
  ['ðŸ —ï¸', '🏗️'],
  ['ðŸŒŸ', '🌟'],
  ['ðŸŒ ', '🌐'],
  ['ðŸŒ', '🌐'],
  ['ðŸ§ª', '🧪'],
  ['ðŸ¤ ', '🤝'],
  ['ðŸ¤', '🤝'],
  ['ðŸ“Š', '📊'],
  ['ðŸ“ž', '📞'],
  ['ðŸ—ºï¸ ', '🗺️ '],
  ['ðŸ—ºï¸', '🗺️'],
  ['ðŸ“ ', '📜'],
  ['ðŸ“', '📜'],
  ['ðŸ™ ', '🙏'],
  ['ðŸ™', '🙏'],
  ['âœ…', '✅'],
  ['âš¡', '⚡'],
  ['âœ¨', '✨'],
  ['âš\xa0ï¸ ', '⚠️ '],
  ['âš\xa0ï¸', '⚠️'],
  ['â€¢', '•'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â†’', '→'],
  ['â†‘', '↑'],
  ['â†“', '↓'],
  ['âœ—', '✗'],
  ['âœ“', '✓'],
  ['â”Œ', '┌'],
  ['â”€', '─'],
  ['â” ', '┐'],
  ['â”‚', '│'],
  ['â””', '└'],
  ['â”˜', '┘'],
  ['â”œ', '├'],
  ['â”¬', '┬'],
  ['â”´', '┴'],
  ['â”¼', '┼'],
  ['â–¼', '▼'],
  ['â­ ', '⭐ '],
  ['â­', '⭐'],
  ['â ¤ï¸ ', '❤️ '],
  ['â ¤ï¸', '❤️'],
  ['ðŸ‘‰', '👉'],
  ['ðŸ“„', '📄'],
  ['ðŸ †', '🏆'],
  ['ðŸ’¾', '💾'],
  ['ðŸ”‘', '🔑'],
  ['ðŸŽ“', '🎓'],
  ['ðŸŸ¡', '🟡'],
  ['ðŸ“ˆ', '📈'],
  ['ðŸ ƒ', '🏃'],
  ['ðŸ†˜', '🆘'],
  ['ðŸŽ ', '🎁'],
  ['ðŸŽ', '🎁'],
  ['ðŸ   ', '🏁'],
  ['ðŸ”®', '🔮'],
  ['ðŸ” ', '🔍'],
  ['ðŸ”¢', '🔢'],
  ['ðŸ ›', '🐛'],
  ['ðŸ“§', '📧'],
  ['ðŸ’¬', '💬'],
  ['ðŸ—„ï¸ ', '🗄️ '],
  ['ðŸ—„ï¸', '🗄️'],
  ['ðŸ”Œ', '🔌'],
  ['ðŸ”§', '🔧'],
  ['ðŸ’»', '💻'],
  ['ðŸ‘¥', '👥'],
  ['1ï¸ âƒ£', '1️⃣'],
  ['2ï¸ âƒ£', '2️⃣'],
  ['3ï¸ âƒ£', '3️⃣'],
  ['4ï¸ âƒ£', '4️⃣']
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [bad, good] of MOJIBAKE_MAP) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned mojibake in: ${filePath}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.agents') continue;
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting documentation mojibake scan...');
if (fs.existsSync('README.md')) processFile('README.md');
if (fs.existsSync('CONTRIBUTING.md')) processFile('CONTRIBUTING.md');
if (fs.existsSync('docs')) walkDir('docs');
if (fs.existsSync('apps')) walkDir('apps');
console.log('Finished documentation mojibake scan.');
