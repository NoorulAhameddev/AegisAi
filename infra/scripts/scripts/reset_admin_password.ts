import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/services/auth/auth";
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

async function main() {
  console.log("⚠️  This will reset the password for all ADMIN role users.");
  console.log("⚠️  The new password will be shown ONCE and NOT stored.\n");

  const confirm = await ask("Type 'yes' to continue: ");
  if (confirm.toLowerCase() !== "yes") {
    console.log("❌ Aborted.");
    process.exit(0);
  }

  const newPassword = await ask("Enter new password: ");
  if (newPassword.length < 12) {
    console.log("❌ Password must be at least 12 characters.");
    process.exit(1);
  }

  const hashedPassword = await hashPassword(newPassword);

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
  });

  if (admins.length > 0) {
    for (const admin of admins) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      });
      console.log(`✅ Reset password for ${admin.email}`);
    }
  } else {
    const anyUser = await prisma.user.findFirst();
    if (anyUser) {
      await prisma.user.update({
        where: { id: anyUser.id },
        data: { role: "ADMIN", password: hashedPassword },
      });
      console.log(`✅ Promoted and reset password for ${anyUser.email}`);
    } else {
      console.log("❌ No users found in database.");
      process.exit(1);
    }
  }

  console.log("\n🎉 Password reset complete.");
  console.log("💡 Password was displayed above and NOT saved to any file.");
  console.log("💡 Change this password after first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
