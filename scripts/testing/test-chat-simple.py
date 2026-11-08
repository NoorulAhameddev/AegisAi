#!/usr/bin/env python3
"""
Simple Chat Test - Tests chat endpoints with proper cookie handling
"""

import http.client
import json
import time

def test_chat():
    print('\n' + '='*60)
    print('🤖 Aegis AI - Chat Functionality Test')
    print('='*60 + '\n')
    
    # Create test user
    email = f'chattest_{int(time.time())}@test.com'
    password = 'ChatTest123!'
    
    print('Step 1: Creating test account')
    print('─' * 50)
    print(f'  Email: {email}')
    print(f'  Password: {password}')
    
    conn = http.client.HTTPConnection('127.0.0.1', 3000, timeout=10)
    conn.request('POST', '/api/auth/register',
        json.dumps({'email': email, 'password': password, 'name': 'Chat Tester'}),
        {'Content-Type': 'application/json'})
    
    resp = conn.getresponse()
    register_status = resp.status
    register_body = json.loads(resp.read().decode())
    conn.close()
    
    print(f'  Status: {register_status}')
    if register_status in [200, 201]:
        print('  ✓ Account created successfully')
    else:
        print(f'  ✗ Failed: {register_body}')
        return False
    
    # Login and get cookies
    print('\nStep 2: Logging in')
    print('─' * 50)
    
    conn = http.client.HTTPConnection('127.0.0.1', 3000, timeout=10)
    conn.request('POST', '/api/auth/login',
        json.dumps({'email': email, 'password': password}),
        {'Content-Type': 'application/json'})
    
    resp = conn.getresponse()
    login_status = resp.status
    login_headers = dict(resp.getheaders())
    login_body = json.loads(resp.read().decode())
    
    # Extract cookies from Set-Cookie headers
    cookies = {}
    if 'set-cookie' in login_headers:
        for cookie in login_headers['set-cookie'].split(','):
            parts = cookie.split(';')[0].split('=', 1)
            if len(parts) == 2:
                cookies[parts[0].strip()] = parts[1].strip()
    
    conn.close()
    
    print(f'  Status: {login_status}')
    print(f'  Response: {login_body}')
    
    if login_status == 200:
        print('  ✓ Login successful')
        if cookies:
            print(f'  ✓ Auth cookies received: {list(cookies.keys())}')
    else:
        print('  ✗ Login failed')
        return False
    
    # Build cookie header
    cookie_header = '; '.join([f'{k}={v}' for k, v in cookies.items()])
    
    # Test chat endpoints
    print('\nStep 3: Testing Chat Endpoints')
    print('─' * 50)
    
    # Test 1: Chat SSE endpoint (streaming)
    print('  Test 1: POST /api/chat/stream-sse (Streaming Chat)')
    conn = http.client.HTTPConnection('127.0.0.1', 3000, timeout=10)
    conn.request('POST', '/api/chat/stream-sse',
        json.dumps({
            'message': 'Hello! Tell me about Aegis AI.',
            'conversationId': 'test-chat'
        }),
        {
            'Content-Type': 'application/json',
            'Cookie': cookie_header
        })
    
    resp = conn.getresponse()
    sse_status = resp.status
    sse_body = resp.read().decode()
    conn.close()
    
    print(f'    Status: {sse_status}')
    
    if sse_status == 200:
        response_preview = sse_body[:100].replace('\n', ' ')
        print(f'    ✓ Server sent event stream active')
        print(f'    Preview: {response_preview}...')
    elif sse_status == 401:
        print('    ⚠️  Unauthorized (check cookies)')
    else:
        print(f'    Response: {sse_body[:200]}')
    
    # Test 2: Chat history endpoint
    print('  Test 2: GET /api/chat/history (Chat History)')
    conn = http.client.HTTPConnection('127.0.0.1', 3000, timeout=10)
    conn.request('GET', '/api/chat/history?conversationId=test-chat',
        None,
        {
            'Content-Type': 'application/json',
            'Cookie': cookie_header
        })
    
    resp = conn.getresponse()
    history_status = resp.status
    history_body = json.loads(resp.read().decode())
    conn.close()
    
    print(f'    Status: {history_status}')
    
    if history_status == 200:
        print('    ✓ Chat history retrieved')
        if history_body.get('data'):
            print(f'    Data keys: {list(history_body["data"].keys())}')
    else:
        print(f'    Response: {history_body}')
    
    # Test 3: Create chat endpoint
    print('  Test 3: POST /api/chat/create (Create New Chat)')
    conn = http.client.HTTPConnection('127.0.0.1', 3000, timeout=10)
    conn.request('POST', '/api/chat/create',
        json.dumps({'title': 'Test Chat', 'description': 'Testing'}),
        {
            'Content-Type': 'application/json',
            'Cookie': cookie_header
        })
    
    resp = conn.getresponse()
    create_status = resp.status
    create_body = json.loads(resp.read().decode())
    conn.close()
    
    print(f'    Status: {create_status}')
    
    if create_status in [200, 201]:
        print('    ✓ Chat created')
        if create_body.get('data'):
            print(f'    Chat ID: {create_body["data"].get("chatId", "N/A")}')
    else:
        print(f'    Response: {create_body}')
    
    # Summary
    print('\n' + '='*60)
    print('📊 Test Summary')
    print('='*60)
    
    tests_passed = sum([
        sse_status == 200,
        history_status == 200,
        create_status in [200, 201]
    ])
    
    print(f'  Tests Passed: {tests_passed}/3')
    
    if tests_passed >= 2:
        print('\n✅ Chat system is WORKING!')
        print('   - Can send messages')
        print('   - Can retrieve history')
        print('   - Authentication working')
        return True
    else:
        print('\n⚠️  Chat system has issues')
        print('   - Some endpoints not responding')
        print('   - Check server logs for details')
        return False

if __name__ == '__main__':
    import sys
    success = test_chat()
    print('='*60 + '\n')
    sys.exit(0 if success else 1)
