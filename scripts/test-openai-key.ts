#!/usr/bin/env tsx
/**
 * Diagnostic tool to test OpenAI API key validity
 * Run with: npx tsx scripts/test-openai-key.ts
 */

import 'dotenv/config';
import OpenAI from 'openai';

async function testOpenAIKey() {
    console.log('\n========== OpenAI API Key Diagnostic Tool ==========\n');
    
    const rawKey = process.env.OPENAI_API_KEY || '';
    const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
    
    console.log('📋 Key Analysis:');
    console.log(`   Raw Key Length: ${rawKey.length}`);
    console.log(`   Clean Key Length: ${cleanKey.length}`);
    console.log(`   Starts with "sk-": ${cleanKey.startsWith('sk-') ? '✅ YES' : '❌ NO'}`);
    console.log(`   Contains newlines: ${rawKey.includes('\n') ? '❌ YES (ERROR)' : '✅ NO'}`);
    console.log(`   First 15 chars: ${cleanKey.substring(0, 15)}`);
    console.log(`   Last 15 chars:  ${cleanKey.substring(cleanKey.length - 15)}`);
    
    if (!cleanKey) {
        console.log('\n❌ ERROR: No API key found in .env');
        process.exit(1);
    }
    
    if (!cleanKey.startsWith('sk-')) {
        console.log('\n❌ ERROR: Key does not start with "sk-"');
        process.exit(1);
    }
    
    if (cleanKey.length < 20) {
        console.log('\n❌ ERROR: Key is too short (minimum 20 characters)');
        process.exit(1);
    }
    
    console.log('\n🧪 Testing with OpenAI API...\n');
    
    const openai = new OpenAI({
        apiKey: cleanKey,
        timeout: 10000,
        maxRetries: 0, // No retries for diagnostic
    });
    
    try {
        console.log('📡 Sending test request to OpenAI API...');
        const response = await openai.models.retrieve('gpt-4o-mini');
        
        console.log('\n✅ SUCCESS! API key is valid!\n');
        console.log('Model Details:');
        console.log(`   ID: ${response.id}`);
        console.log(`   Type: ${response.object}`);
        console.log(`   Owner: ${response.owned_by}`);
        
        // Now test a chat completion
        console.log('\n📡 Testing chat completion...');
        const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hello!' }],
            max_tokens: 10,
        });
        
        console.log('✅ Chat completion successful!\n');
        console.log(`Response: ${chatResponse.choices[0].message.content}`);
        console.log(`\n✅ Your API key is fully functional!`);
        
    } catch (error: any) {
        console.log('\n❌ ERROR! API key validation failed!\n');
        
        const status = error.status;
        const message = error.message;
        const code = error.code;
        
        console.log(`Status Code: ${status}`);
        console.log(`Error Code: ${code}`);
        console.log(`Message: ${message}`);
        
        if (status === 401) {
            console.log('\n🔍 DIAGNOSIS: Authentication failed (401)');
            console.log('Possible causes:');
            console.log('  1. API key is incorrect or revoked');
            console.log('  2. API key contains spaces or hidden characters');
            console.log('  3. API key has expired');
            console.log('  4. Account has insufficient permissions');
            console.log('\n💡 Solution:');
            console.log('  1. Go to https://platform.openai.com/account/api-keys');
            console.log('  2. Create a NEW API key');
            console.log('  3. Copy it carefully (no spaces before/after)');
            console.log('  4. Update .env file with exact key');
            console.log('  5. Restart the server');
        } else if (status === 429) {
            console.log('\n🔍 DIAGNOSIS: Rate limited (429)');
            console.log('Cause: Too many requests to OpenAI API');
            console.log('Solution: Wait a minute and try again');
        } else if (status === 500) {
            console.log('\n🔍 DIAGNOSIS: OpenAI server error (500)');
            console.log('Cause: OpenAI API is experiencing issues');
            console.log('Solution: Try again in a few moments');
        } else {
            console.log('\n🔍 DIAGNOSIS: Unknown error');
            console.log('Full error details:');
            console.log(error);
        }
        
        process.exit(1);
    }
}

testOpenAIKey();
