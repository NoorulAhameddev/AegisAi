/**
 * Microsoft Edge Browser Automation Demo
 * Run: npx tsx scripts/test-edge.ts
 */

import puppeteer from 'puppeteer';

async function testEdgeBrowser() {
  console.log('🌐 Starting Microsoft Edge Browser Automation...\n');

  try {
    // Find Edge executable path
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    
    console.log('🚀 Launching Microsoft Edge...');
    
    const browser = await puppeteer.launch({
      executablePath: edgePath,
      headless: false, // Set to true for headless mode
      defaultViewport: {
        width: 1280,
        height: 720
      },
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();
    
    console.log('✅ Edge browser launched successfully!\n');

    // Example 1: Navigate to GitHub Token Settings
    console.log('📋 Demo 1: Navigating to GitHub Token Settings...');
    await page.goto('https://github.com/settings/tokens', {
      waitUntil: 'networkidle2'
    });
    console.log('✅ Opened GitHub Token page\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Example 2: Navigate to Brave Search API
    console.log('📋 Demo 2: Navigating to Brave Search API...');
    await page.goto('https://api.search.brave.com/register', {
      waitUntil: 'networkidle2'
    });
    console.log('✅ Opened Brave Search API page\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Example 3: Navigate to your local app
    console.log('📋 Demo 3: Navigating to local Aegis-AI app...');
    try {
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle2',
        timeout: 5000
      });
      console.log('✅ Opened local app\n');
    } catch (error) {
      console.log('⚠️  Local app not running (that\'s okay!)\n');
    }

    // Get page info
    const title = await page.title();
    const url = page.url();
    
    console.log('📊 Current Page Info:');
    console.log(`  Title: ${title}`);
    console.log(`  URL: ${url}\n`);

    console.log('⏰ Keeping browser open for 10 seconds...');
    console.log('   (You can interact with the browser now)\n');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Clean up
    console.log('🧹 Closing browser...');
    await browser.close();
    
    console.log('\n✅ Microsoft Edge automation test completed successfully!');
    console.log('\n📚 You can now use this in your MCP client to:');
    console.log('   - Automate API key retrieval');
    console.log('   - Test your web application');
    console.log('   - Scrape data');
    console.log('   - Perform end-to-end testing');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('Could not find') || error.message.includes('executablePath')) {
      console.log('\n💡 Solution: Update the Edge path in the script:');
      console.log('   Common paths:');
      console.log('   - C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
      console.log('   - C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe');
      console.log('\n   Or use Chrome instead by removing executablePath option.');
    }
  }
}

testEdgeBrowser().catch(console.error);
