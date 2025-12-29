const fetch = require('node-fetch');

async function test() {
    const res = await fetch('http://localhost:3000/api/test');
    const data = await res.json();
    console.log('API Test:', data);
}

test();
