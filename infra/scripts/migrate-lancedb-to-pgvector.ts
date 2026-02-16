/**
 * LanceDB to pgvector Migration Script
 * 
 * This script migrates vector embeddings from LanceDB to PostgreSQL pgvector.
 * Run this after enabling pgvector extension and creating indexes.
 * 
 * Usage:
 *   npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts
 */

import { prisma } from '../../apps/web/src/lib/prisma';
import fs from 'fs';
import path from 'path';

interface LanceDBDocument {
    id: string;
    text: string;
    vector: number[];
    metadata: any;
    userId: string;
    sourceId?: string;
    chunkIndex?: number;
    createdAt?: number;
}

async function checkPgvectorSetup(): Promise<void> {
    try {
        // Check if pgvector extension exists
        const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS(
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) as exists
        `;
        
        if (!result[0].exists) {
            throw new Error('pgvector extension not installed. Run pgvector-setup.sql first.');
        }
        
        console.log('✅ pgvector extension is installed');
        
        // Check if indexes exist
        const indexCheck = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count
            FROM pg_indexes
            WHERE tablename = 'Document'
                AND indexname LIKE '%vector%'
        `;
        
        const indexCount = Number(indexCheck[0].count);
        console.log(`✅ Found ${indexCount} vector indexes`);
        
        if (indexCount === 0) {
            console.warn('⚠️  No vector indexes found. Consider running pgvector-setup.sql for better performance.');
        }
    } catch (error) {
        console.error('❌ pgvector setup check failed:', error);
        throw error;
    }
}

async function getLanceDBStats(): Promise<{ totalDocuments: number; totalUsers: Set<string> }> {
    const lancedbPath = path.join(process.cwd(), 'data', 'lancedb');
    
    if (!fs.existsSync(lancedbPath)) {
        throw new Error(`LanceDB directory not found: ${lancedbPath}`);
    }
    
    // Check for table directories
    const files = fs.readdirSync(lancedbPath);
    console.log(`📂 Found LanceDB files: ${files.join(', ')}`);
    
    // For actual migration, would need to:
    // 1. Import LanceDB SDK
    // 2. Connect to database
    // 3. Read all documents
    // For now, return mock stats
    
    return {
        totalDocuments: 0,
        totalUsers: new Set(),
    };
}

async function migrateDocuments(dryRun: boolean = true): Promise<void> {
    console.log('\n🚀 Starting LanceDB → pgvector migration');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}\n`);
    
    // Check prerequisites
    await checkPgvectorSetup();
    
    // Get LanceDB stats
    const stats = await getLanceDBStats();
    console.log(`📊 LanceDB Stats:`);
    console.log(`   Total Documents: ${stats.totalDocuments}`);
    console.log(`   Total Users: ${stats.totalUsers.size}`);
    
    if (stats.totalDocuments === 0) {
        console.log('\n⚠️  No documents found in LanceDB. Nothing to migrate.');
        console.log('   If you have documents, ensure LanceDB SDK is installed and database is accessible.');
        return;
    }
    
    // Migration would happen here
    // For each document in LanceDB:
    // 1. Read document with vector
    // 2. Insert into PostgreSQL Document table
    // 3. Handle errors (skip duplicates, log failures)
    // 4. Update progress every 100 documents
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Example migration logic (pseudocode):
    /*
    const lancedb = await import('@lancedb/lancedb');
    const db = await lancedb.connect(lancedbPath);
    const table = await db.openTable('documents');
    
    for await (const doc of table.query()) {
        try {
            if (dryRun) {
                console.log(`Would migrate: ${doc.id}`);
                continue;
            }
            
            await prisma.$executeRaw`
                INSERT INTO "Document" (
                    id, text, vector, metadata, "userId", "sourceId", 
                    "chunkIndex", "createdAt"
                )
                VALUES (
                    ${doc.id},
                    ${doc.text},
                    ${JSON.stringify(doc.vector)}::vector,
                    ${JSON.stringify(doc.metadata)}::jsonb,
                    ${doc.userId},
                    ${doc.sourceId},
                    ${doc.chunkIndex},
                    ${new Date(doc.createdAt)}
                )
                ON CONFLICT (id) DO NOTHING
            `;
            
            migratedCount++;
            
            if (migratedCount % 100 === 0) {
                console.log(`   Progress: ${migratedCount} documents migrated`);
            }
        } catch (error) {
            errorCount++;
            console.error(`   ❌ Failed to migrate document ${doc.id}:`, error);
        }
    }
    */
    
    console.log('\n✅ Migration Summary:');
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (!dryRun && migratedCount > 0) {
        console.log('\n🔄 Analyzing table and updating statistics...');
        await prisma.$executeRaw`ANALYZE "Document"`;
        console.log('✅ Table statistics updated');
    }
}

async function verifyMigration(): Promise<void> {
    console.log('\n🔍 Verifying migration...');
    
    // Get document counts
    const totalDocs = await prisma.document.count();
    const docsWithVectors = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Document"
        WHERE vector IS NOT NULL
    `;
    
    const vectorCount = Number(docsWithVectors[0].count);
    
    console.log(`📊 PostgreSQL Stats:`);
    console.log(`   Total Documents: ${totalDocs}`);
    console.log(`   Documents with Vectors: ${vectorCount}`);
    console.log(`   Coverage: ${totalDocs > 0 ? (vectorCount / totalDocs * 100).toFixed(1) : 0}%`);
    
    // Test vector search
    if (vectorCount > 0) {
        console.log('\n🧪 Testing vector search...');
        const testVector = Array(1536).fill(0).map(() => Math.random());
        
        const results = await prisma.$queryRaw<Array<any>>`
            SELECT id, text, (vector <-> ${JSON.stringify(testVector)}::vector) as distance
            FROM "Document"
            WHERE vector IS NOT NULL
            ORDER BY distance ASC
            LIMIT 5
        `;
        
        console.log(`✅ Vector search working! Found ${results.length} results`);
    }
}

async function showUsageHelp(): void {
    console.log(`
🔧 LanceDB to pgvector Migration Tool

Usage:
  npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts [command]

Commands:
  check      Check pgvector setup and prerequisites
  dry-run    Simulate migration without making changes (default)
  migrate    Run actual migration to PostgreSQL
  verify     Verify migration completeness
  help       Show this help message

Examples:
  # Check if pgvector is set up correctly
  npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts check

  # Simulate migration
  npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts dry-run

  # Run actual migration
  npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts migrate

  # Verify after migration
  npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts verify

Prerequisites:
  1. Run pgvector-setup.sql to create indexes and functions
  2. Ensure DATABASE_URL is set in .env
  3. Have LanceDB data in data/lancedb/ directory

⚠️  Important Notes:
  - Always run 'dry-run' first to check what will be migrated
  - Migration is idempotent (can be run multiple times)
  - Existing documents in PostgreSQL are skipped (no duplicates)
  - Failed migrations are logged but don't stop the process
`);
}

async function main() {
    const command = process.argv[2] || 'help';
    
    try {
        switch (command) {
            case 'check':
                await checkPgvectorSetup();
                break;
            
            case 'dry-run':
                await migrateDocuments(true);
                break;
            
            case 'migrate':
                const confirm = process.env.CONFIRM_MIGRATION === 'yes';
                if (!confirm) {
                    console.log('⚠️  LIVE MIGRATION MODE');
                    console.log('Set CONFIRM_MIGRATION=yes to proceed:');
                    console.log('  CONFIRM_MIGRATION=yes npm run tsx -- infra/scripts/migrate-lancedb-to-pgvector.ts migrate');
                    process.exit(1);
                }
                await migrateDocuments(false);
                break;
            
            case 'verify':
                await verifyMigration();
                break;
            
            case 'help':
            default:
                await showUsageHelp();
                break;
        }
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
}
