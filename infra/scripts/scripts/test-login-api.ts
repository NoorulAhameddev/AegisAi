import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function testLogin() {
  const email = await ask("Enter email: ");
  const password = await ask("Enter password: ");

  console.log(`🌐 Testing API Login for ${email}...`);

  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", data);

    if (response.ok) {
      console.log("✅ API Login Success!");
    } else {
      console.log("❌ API Login Failed!");
    }
  } catch (error) {
    console.error("❌ Error hitting API:", error);
  } finally {
    rl.close();
  }
}

testLogin();
