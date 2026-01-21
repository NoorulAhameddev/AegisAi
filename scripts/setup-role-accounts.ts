import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const roleAccounts = [
  {
    name: "Super Admin",
    email: "superadmin@aegis.ai",
    password: "SuperAdmin@123",
    role: "SUPER_ADMIN",
  },
  {
    name: "Admin User",
    email: "admin@aegis.ai",
    password: "Admin@123",
    role: "ADMIN",
  },
  {
    name: "Moderator User",
    email: "moderator@aegis.ai",
    password: "Moderator@123",
    role: "MODERATOR",
  },
  {
    name: "Analyst User",
    email: "analyst@aegis.ai",
    password: "Analyst@123",
    role: "ANALYST",
  },
  {
    name: "Support User",
    email: "support@aegis.ai",
    password: "Support@123",
    role: "SUPPORT",
  },
  {
    name: "Regular User",
    email: "user@aegis.ai",
    password: "User@123",
    role: "USER",
  },
];

async function setupRoleAccounts() {
  try {
    console.log("🗑️  Deleting all existing users...");

    // Delete all users (cascade will handle related records)
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.count} users`);

    console.log("\n👥 Creating role-based accounts...\n");

    for (const account of roleAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 12);

      const user = await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          password: hashedPassword,
          role: account.role as any,
        },
      });

      console.log(
        `✅ Created ${account.role.padEnd(12)} | ${account.email.padEnd(
          25
        )} | Password: ${account.password}`
      );
    }

    console.log("\n🎉 All role-based accounts created successfully!\n");
    console.log("📋 Account Summary:");
    console.log(
      "═══════════════════════════════════════════════════════════════════"
    );
    console.log("Role          | Email                     | Password");
    console.log(
      "───────────────────────────────────────────────────────────────────"
    );

    roleAccounts.forEach((account) => {
      console.log(
        `${account.role.padEnd(12)} | ${account.email.padEnd(25)} | ${
          account.password
        }`
      );
    });

    console.log(
      "═══════════════════════════════════════════════════════════════════"
    );
    console.log("\n💡 You can now login with any of these accounts!");
  } catch (error) {
    console.error("❌ Error setting up role accounts:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupRoleAccounts().catch((error) => {
  console.error(error);
  process.exit(1);
});
