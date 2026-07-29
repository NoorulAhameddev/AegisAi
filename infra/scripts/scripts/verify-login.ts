import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function verifyLogin() {
  const email = await ask("Enter email to verify: ");

  try {
    console.log(`🔍 Verifying login for ${email}...`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error("❌ User not found!");
      return;
    }

    console.log("✅ User found in database.");
    console.log("User Role:", user.role);

    const password = await ask("Enter password to verify: ");
    console.log("🔐 Comparing password...");
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log("✅ Password Match! Login should work.");
    } else {
      console.error("❌ Password Mismatch!");
    }
  } catch (error) {
    console.error("❌ Error verifying login:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

verifyLogin();
