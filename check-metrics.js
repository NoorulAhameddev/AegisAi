const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const metrics = await prisma.usageMetric.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log("Recent Usage Metrics:");
    metrics.forEach(m => console.log(`- User: ${m.userId}, Tokens: ${m.tokens}, Time: ${m.createdAt}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
