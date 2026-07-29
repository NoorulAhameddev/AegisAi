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

async function setupRoleAccounts() {
  try {
    console.log("⚠️  This script will create default role-based accounts.");
    console.log("⚠️  It will NOT delete existing users.\n");

    const confirm = await ask("Type 'yes' to continue: ");
    if (confirm.toLowerCase() !== "yes") {
      console.log("❌ Aborted.");
      process.exit(0);
    }

    const defaultPassword = await ask(
      "Set default password for all accounts: ",
    );
    if (defaultPassword.length < 12) {
      console.log("❌ Password must be at least 12 characters.");
      process.exit(1);
    }

    const roleAccounts = [
      {
        name: "Super Admin",
        email: "superadmin@aegis.ai",
        role: "SUPER_ADMIN",
      },
      { name: "Admin User", email: "admin@aegis.ai", role: "ADMIN" },
      {
        name: "Moderator User",
        email: "moderator@aegis.ai",
        role: "MODERATOR",
      },
      { name: "Analyst User", email: "analyst@aegis.ai", role: "ANALYST" },
      { name: "Support User", email: "support@aegis.ai", role: "SUPPORT" },
      { name: "Regular User", email: "user@aegis.ai", role: "USER" },
    ];

    console.log("\n👥 Creating/updating role-based accounts...\n");

    for (const account of roleAccounts) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 14);

      const existing = await prisma.user.findUnique({
        where: { email: account.email },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { password: hashedPassword, role: account.role as any },
        });
        console.log(`🔄 Updated ${account.role.padEnd(12)} | ${account.email}`);
      } else {
        await prisma.user.create({
          data: {
            name: account.name,
            email: account.email,
            password: hashedPassword,
            role: account.role as any,
          },
        });
        console.log(`✅ Created ${account.role.padEnd(12)} | ${account.email}`);
      }
    }

    console.log("\n🎉 Role-based accounts setup complete!");
    console.log(
      "💡 Password was NOT stored anywhere. Change these passwords after first login.",
    );
  } catch (error) {
    console.error("❌ Error setting up role accounts:", error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

setupRoleAccounts().catch((error) => {
  console.error(error);
  process.exit(1);
});
