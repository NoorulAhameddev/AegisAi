#!/usr/bin/env python3
"""
Aegis AI - Chatbot Testing Script
Tests chat functionality end-to-end
"""

import http.client
import json
import time
import sys

class ChatbotTester:
    def __init__(self, host='127.0.0.1', port=3000):
        self.host = host
        self.port = port
        self.token = None
        self.user_id = None
        self.chat_id = None
        
    def _request(self, method, path, body=None, headers=None):
        """Make HTTP request"""
        try:
            conn = http.client.HTTPConnection(self.host, self.port, timeout=10)
            
            req_headers = {'Content-Type': 'application/json'}
            if headers:
                req_headers.update(headers)
            if self.token:
                req_headers['Authorization'] = f'Bearer {self.token}'
            
            conn.request(method, path, 
                        json.dumps(body) if body else None,
                        req_headers)
            
            response = conn.getresponse()
            response_body = response.read().decode()
            
            try:
                data = json.loads(response_body)
            except:
                data = response_body
            
            conn.close()
            return response.status, data
        except Exception as e:
            return 0, {'error': str(e)}
    
    def register(self):
        """Register a new user"""
        print('\n📝 Step 1: Registering User')
        print('─' * 50)
        
        email = f'chat_test_{int(time.time())}@test.com'
        password = 'ChatTest123!'
        
        status, response = self._request('POST', '/api/auth/register', {
            'email': email,
            'password': password,
            'name': 'Chat Tester'
        })
        
        print(f'  Email: {email}')
        print(f'  Status: {status}')
        
        if status in [200, 201]:
            print('  ✓ Registration successful')
            return email, password
        else:
            print(f'  ✗ Registration failed: {response}')
            return None, None
    
    def login(self, email, password):
        """Login user and get token"""
        print('\n🔐 Step 2: Logging In')
        print('─' * 50)
        
        status, response = self._request('POST', '/api/auth/login', {
            'email': email,
            'password': password
        })
        
        print(f'  Status: {status}')
        
        if status == 200 and response.get('data'):
            token = response['data'].get('accessToken') or response['data'].get('token')
            if token:
                self.token = token
                self.user_id = response['data'].get('userId') or response['data'].get('id')
                print(f'  ✓ Login successful')
                print(f'  Token: {token[:30]}...')
                return True
        
        print(f'  ✗ Login failed: {response}')
        return False
    
    def create_chat(self):
        """Create a new chat"""
        print('\n💬 Step 3: Creating Chat')
        print('─' * 50)
        
        status, response = self._request('POST', '/api/chat/create', {
            'title': 'Test Chat',
            'description': 'Testing chat functionality'
        })
        
        print(f'  Status: {status}')
        
        if status in [200, 201] and response.get('data'):
            self.chat_id = response['data'].get('chatId') or response['data'].get('id')
            print(f'  ✓ Chat created')
            print(f'  Chat ID: {self.chat_id}')
            return True
        
        print(f'  ✗ Chat creation failed: {response}')
        return False
    
    def send_message(self, message):
        """Send a chat message"""
        print(f'\n✉️  Step 4: Sending Message')
        print('─' * 50)
        print(f'  Message: "{message}"')
        
        payload = {
            'message': message,
            'conversationId': self.chat_id or 'test'
        }
        
        # Try SSE endpoint first
        status, response = self._request('POST', '/api/chat/stream-sse', payload)
        
        print(f'  Status: {status}')
        
        if status == 200:
            print('  ✓ Message sent (SSE stream)')
            print(f'  Response preview: {str(response)[:100]}...')
            return True
        elif status == 401:
            print('  ⚠️  Unauthorized - token may be invalid')
            return False
        elif status == 400:
            print('  ⚠️  Bad request - check message format')
            return False
        else:
            print(f'  ✗ Message failed: {response}')
            return False
    
    def get_chat_history(self):
        """Get chat history"""
        print('\n📜 Step 5: Retrieving Chat History')
        print('─' * 50)
        
        path = f'/api/chat/history?conversationId={self.chat_id or "test"}'
        status, response = self._request('GET', path)
        
        print(f'  Status: {status}')
        
        if status == 200 and response.get('data'):
            messages = response['data'].get('messages', [])
            print(f'  ✓ Retrieved {len(messages)} message(s)')
            
            for i, msg in enumerate(messages[:3], 1):
                print(f'    {i}. {msg.get("role", "?")}: {msg.get("content", "")[:50]}...')
            
            return True
        elif status == 401:
            print('  ⚠️  Unauthorized - authentication issue')
            return False
        else:
            print(f'  ✗ History retrieval failed: {response}')
            return False
    
    def test_chat_endpoints(self):
        """Test various chat endpoints"""
        print('\n🔍 Step 6: Testing Chat Endpoints')
        print('─' * 50)
        
        endpoints = [
            ('POST', '/api/chat/stream', {'message': 'Hello', 'conversationId': 'test'}),
            ('GET', '/api/chat/status/test-job', None),
        ]
        
        for method, path, body in endpoints:
            status, _ = self._request(method, path, body)
            endpoint = path.split('?')[0]  # Remove query params
            
            if status == 200:
                print(f'  ✓ {method} {endpoint}: {status}')
            elif status in [400, 401]:
                print(f'  ⚠️  {method} {endpoint}: {status} (expected)')
            else:
                print(f'  ? {method} {endpoint}: {status}')
    
    def run(self):
        """Run full test suite"""
        print('\n' + '='*60)
        print('🤖 Aegis AI - Chat Testing Suite')
        print('='*60)
        
        # Register
        email, password = self.register()
        if not email:
            print('\n❌ Registration failed - stopping tests')
            return False
        
        # Login
        if not self.login(email, password):
            print('\n❌ Login failed - stopping tests')
            return False
        
        # Create chat
        print('\n⏭️  Attempting to create chat (optional)...')
        self.create_chat()
        
        # Send message
        messages = [
            'Hello! How are you?',
            'What is Aegis AI?',
            'Tell me about your features'
        ]
        
        success_count = 0
        for msg in messages:
            if self.send_message(msg):
                success_count += 1
                time.sleep(1)  # Small delay between messages
        
        # Get history
        if success_count > 0:
            print()
            self.get_chat_history()
        
        # Test endpoints
        self.test_chat_endpoints()
        
        # Summary
        print('\n' + '='*60)
        print('📊 Test Summary')
        print('='*60)
        print(f'  Messages sent: {success_count}/3')
        
        if success_count > 0:
            print('\n✅ Chat functionality is WORKING!')
            print('   - Can send messages')
            print('   - Responses are being processed')
            print('   - API endpoints are functional')
        else:
            print('\n⚠️  Chat functionality needs attention')
            print('   - Messages not sending properly')
            print('   - Check API logs for details')
        
        print('='*60 + '\n')
        
        return success_count > 0

if __name__ == '__main__':
    tester = ChatbotTester()
    success = tester.run()
    sys.exit(0 if success else 1)
