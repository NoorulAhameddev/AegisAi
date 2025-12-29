const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const chatId = '28e6c193-b27c-4ea5-988b-23343a2f711a';
    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' }
    });
    console.log(`Messages for ${chatId}:`);
    messages.forEach(m => console.log(`[${m.role}] ${m.content}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
