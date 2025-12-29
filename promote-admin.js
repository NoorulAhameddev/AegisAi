const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = "noorulahamed07@gmail.com";
    const user = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
    });
    console.log(`Successfully promoted ${user.email} to ADMIN.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
