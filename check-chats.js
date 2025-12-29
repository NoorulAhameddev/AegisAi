const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const chats = await prisma.chat.findMany({
        include: { _count: { select: { messages: true } } }
    });
    console.log("Existing Chats:");
    chats.forEach(c => console.log(`- ${c.id}: ${c._count.messages} messages`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
