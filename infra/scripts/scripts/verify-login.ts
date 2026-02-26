import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function verifyLogin() {
  const email = "superadmin@aegis.ai";
  const password = "SuperAdmin@123";

  try {
    console.log(`🔍 Verifying login for ${email}...`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error("❌ User not found!");
      return;
    }

    console.log("✅ User found in database.");
    console.log("User Role:", user.role);
    console.log("Stored Hash:", user.password);

    console.log("🔐 Comparing password...");
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log("✅ Password Match! Login should work.");
    } else {
      console.error("❌ Password Mismatch!");

      // Debug: Hash the password again and compare
      const newHash = await bcrypt.hash(password, 10);
      console.log("New Hash (for reference):", newHash);
    }
  } catch (error) {
    console.error("❌ Error verifying login:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLogin();
