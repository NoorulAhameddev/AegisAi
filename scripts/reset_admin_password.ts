import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import fs from 'fs';

async function main() {
    const newPassword = "adminPassword123!";
    const hashedPassword = await hashPassword(newPassword);

    const admins = await prisma.user.findMany({
        where: {
            role: 'ADMIN'
        }
    });

    if (admins.length > 0) {
        for (const admin of admins) {
            await prisma.user.update({
                where: { id: admin.id },
                data: { password: hashedPassword }
            });
            fs.writeFileSync('admin_creds.txt', `Email: ${admin.email}\nPassword: ${newPassword}`);
        }
    } else {
        // ... fallback logic (abbreviated for speed since we know an admin exists now)
        const anyUser = await prisma.user.findFirst();
        if (anyUser) {
            await prisma.user.update({ where: { id: anyUser.id }, data: { role: 'ADMIN', password: hashedPassword } });
            fs.writeFileSync('admin_creds.txt', `Email: ${anyUser.email}\nPassword: ${newPassword}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
