
async function testLogin() {
  const email = 'superadmin@aegis.ai';
  const password = 'SuperAdmin@123';

  console.log(`🌐 Testing API Login for ${email}...`);

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✅ API Login Success!');
    } else {
      console.log('❌ API Login Failed!');
    }

  } catch (error) {
    console.error('❌ Error hitting API:', error);
  }
}

testLogin();
