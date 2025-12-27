import http from 'http';

const data = JSON.stringify({
  conversationId: '00000000-0000-0000-0000-000000000000',
  message: 'Hello AI from test script',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat/complete',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', res.headers);
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
});

req.write(data);
req.end();
