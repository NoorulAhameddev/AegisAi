const fs = require('fs');
const path = require('path');

// Simple startup-time check: ensures critical env vars are set and not placeholder values
function isPlaceholder(val) {
  if (!val) return true;
  return /REMOVE_ME|REPLACE_WITH|your_/.test(val);
}

const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'AUDIT_SIGNING_KEY'
];

function check() {
  const missing = [];
  for (const k of required) {
    const v = process.env[k];
    if (!v || isPlaceholder(v)) missing.push(k);
  }
  if (missing.length) {
    console.error('CRITICAL: Missing or placeholder secrets detected for:', missing.join(', '));
    console.error('In production, set these via a secret manager and do NOT use .env.example values.');
    process.exit(1);
  }
}

if (require.main === module) {
  // Only enforce strictly when APP_ENV=production
  const env = process.env.APP_ENV || 'development';
  if (env === 'production') check();
}

module.exports = { check };
