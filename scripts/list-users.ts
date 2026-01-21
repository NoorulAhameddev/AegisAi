import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        role: 'asc',
      },
    });

    console.log('\n📋 Current Users in Database:\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Role          | Name                | Email                     | Created');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    
    users.forEach(user => {
      const date = new Date(user.createdAt).toLocaleString();
      console.log(`${user.role.padEnd(12)} | ${user.name.padEnd(19)} | ${user.email.padEnd(25)} | ${date}`);
    });
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`\nTotal Users: ${users.length}\n`);

  } catch (error) {
    console.error('❌ Error listing users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
