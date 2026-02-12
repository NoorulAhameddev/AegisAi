/**
 * Admin Setup Script
 * Upgrades an existing user to SUPER_ADMIN role
 * 
 * Usage: node scripts/setup-admin.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupAdmin() {
    const email = process.argv[2];
    
    if (!email) {
        console.error('❌ Error: Please provide an email address');
        console.log('Usage: node scripts/setup-admin.js <email>');
        process.exit(1);
    }

    try {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, role: true }
        });

        if (!user) {
            console.error(`❌ Error: User with email "${email}" not found`);
            process.exit(1);
        }

        console.log(`\n📋 Current User Details:`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Current Role: ${user.role}`);

        // Update to SUPER_ADMIN
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'SUPER_ADMIN' },
            select: { id: true, name: true, email: true, role: true }
        });

        console.log(`\n✅ Successfully upgraded to SUPER_ADMIN!`);
        console.log(`   Name: ${updated.name}`);
        console.log(`   Email: ${updated.email}`);
        console.log(`   New Role: ${updated.role}`);
        
        console.log(`\n🎯 Next Steps:`);
        console.log(`   1. Visit http://localhost:3000/admin`);
        console.log(`   2. You now have full admin access with all permissions`);
        console.log(`   3. Check the audit logs at /api/admin/audit`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setupAdmin();
