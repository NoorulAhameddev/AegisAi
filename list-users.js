const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log("Current Users:");
    users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
