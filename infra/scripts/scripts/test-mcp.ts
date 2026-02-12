/**
 * Test script for MCP servers
 * Run: npx tsx scripts/test-mcp.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

async function testMCP() {
  console.log('🔍 Testing MCP Server Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  MCP_ENABLED:', process.env.MCP_ENABLED || 'not set (default: false)');
  console.log('  GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not set');
  console.log('  SEARCH_API_KEY:', process.env.SEARCH_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('  MCP_FILESYSTEM_PATH:', process.env.MCP_FILESYSTEM_PATH || './uploads (default)');
  console.log('');

  // Import MCP client
  const { mcpClient } = await import('../src/lib/mcp-client');

  // Get status
  const status = mcpClient.getStatus();
  
  console.log('🎯 MCP Client Status:');
  console.log('  Enabled:', status.enabled ? '✅ Yes' : '❌ No');
  console.log('  Available Servers:', status.availableServers.join(', ') || 'None');
  console.log('');

  console.log('🔧 Server Configuration:');
  console.log('  Filesystem:', status.servers.filesystem ? '✅ Ready' : '❌ Not configured');
  console.log('  GitHub:', status.servers.github ? '✅ Ready' : '❌ Not configured (needs GITHUB_TOKEN)');
  console.log('  Browser:', status.servers.browser ? '✅ Ready' : '❌ Not configured');
  console.log('  n8n:', status.servers.n8n ? '✅ Ready' : '❌ Not configured (needs N8N_URL)');
  console.log('');

  // Setup instructions
  if (!status.enabled) {
    console.log('⚠️  MCP is disabled. Set MCP_ENABLED=true in your .env file to enable.');
  }

  if (!status.servers.github) {
    console.log('ℹ️  To enable GitHub server:');
    console.log('   1. Go to https://github.com/settings/tokens');
    console.log('   2. Generate a token with repo, gist, read:user scopes');
    console.log('   3. Add GITHUB_TOKEN=your_token to .env');
    console.log('');
  }

  if (!status.servers.browser) {
    console.log('ℹ️  Browser Server is available for automation tasks.');
    console.log('');
  }

  if (!status.servers.n8n) {
    console.log('ℹ️  To enable n8n integration:');
    console.log('   1. Set up n8n locally or use cloud');
    console.log('   2. Get your n8n instance URL');
    console.log('   3. Add N8N_URL=your_url to .env');
    console.log('');
  }

  if (status.enabled && status.availableServers.length > 0) {
    console.log('✅ MCP is configured and ready to use!');
  }

  console.log('');
  console.log('📚 Full configuration:', JSON.stringify(status, null, 2));
}

testMCP().catch(console.error);
