#!/usr/bin/env node
/**
 * LanceDB to pgvector Migration Script
 * 
 * Migrates vector embeddings and documents from LanceDB to PostgreSQL with pgvector extension.
 * 
 * Prerequisites:
 * - PostgreSQL with pgvector extension installed
 * - Prisma schema with Document model migrated
 * - Environment variables configured for both vector stores
 * 
 * Usage:
 *   node scripts/migrate-lancedb-to-pgvector.js [options]
 * 
 * Options:
 *   --batchSize <number>    Number of documents to migrate per batch (default: 100)
 *   --dryRun               Preview migration without writing to database
 *   --skipVerification     Skip post-migration verification
 *   --clear                Clear target pgvector database before migration
 * 
 * Example:
 *   node scripts/migrate-lancedb-to-pgvector.js --batchSize 50 --dryRun
 */

import { PrismaClient } from '@prisma/client';
import lancedb from 'vectordb';
import path from 'path';
import fs from 'fs';
import { env } from '../src/lib/env';
import { logger } from '../src/lib/logger';

const prisma = new PrismaClient();

interface MigrationOptions {
    batchSize: number;
    dryRun: boolean;
    skipVerification: boolean;
    clearTarget: boolean;
}

interface LanceDBDocument {
    id: string;
    text: string;
    vector: number[];
    metadata: Record<string, any>;
    userId: string;
    createdAt: number;
}

interface MigrationStats {
    totalDocuments: number;
    migratedDocuments: number;
    failedDocuments: number;
    skippedDocuments: number;
    startTime: number;
    endTime: number;
    errors: Array<{ id: string; error: string }>;
}

/**
 * Parse command line arguments
 */
function parseArguments(): MigrationOptions {
    const args = process.argv.slice(2);
    const options: MigrationOptions = {
        batchSize: 100,
        dryRun: false,
        skipVerification: false,
        clearTarget: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--batchSize':
                options.batchSize = parseInt(args[++i], 10);
                break;
            case '--dryRun':
                options.dryRun = true;
                break;
            case '--skipVerification':
                options.skipVerification = true;
                break;
            case '--clear':
                options.clearTarget = true;
                break;
            default:
                console.warn(`Unknown option: ${args[i]}`);
        }
    }

    return options;
}

/**
 * Connect to LanceDB and retrieve all documents
 */
async function fetchLanceDBDocuments(): Promise<LanceDBDocument[]> {
    try {
        const dbPath = path.join(process.cwd(), 'data', 'lancedb');
        
        if (!fs.existsSync(dbPath)) {
            throw new Error(`LanceDB not found at ${dbPath}`);
        }

        const db = await lancedb.connect(dbPath);
        const tableNames = await db.tableNames();
        
        if (tableNames.length === 0) {
            logger.info('[Migration] No tables found in LanceDB');
            return [];
        }

        logger.info('[Migration] Found LanceDB tables', { tables: tableNames });

        const allDocuments: LanceDBDocument[] = [];

        for (const tableName of tableNames) {
            try {
                const table = await db.openTable(tableName);
                const results = await table.search([]).limit(100000).execute(); // Fetch all
                
                logger.info(`[Migration] Fetched documents from table: ${tableName}`, {
                    count: results.length,
                });

                allDocuments.push(...results);
            } catch (error) {
                logger.error(`[Migration] Failed to read table: ${tableName}`, error as Error);
            }
        }

        return allDocuments;
    } catch (error) {
        logger.error('[Migration] Failed to connect to LanceDB', error as Error);
        throw error;
    }
}

/**
 * Clear all documents from pgvector (if --clear flag is set)
 */
async function clearPgvector(): Promise<number> {
    try {
        const result = await prisma.document.deleteMany({});
        logger.warn('[Migration] Cleared pgvector database', { deletedCount: result.count });
        return result.count;
    } catch (error) {
        logger.error('[Migration] Failed to clear pgvector', error as Error);
        throw error;
    }
}

/**
 * Migrate documents in batches
 */
async function migrateBatch(
    documents: LanceDBDocument[],
    options: MigrationOptions
): Promise<MigrationStats> {
    const stats: MigrationStats = {
        totalDocuments: documents.length,
        migratedDocuments: 0,
        failedDocuments: 0,
        skippedDocuments: 0,
        startTime: Date.now(),
        endTime: 0,
        errors: [],
    };

    const batches = Math.ceil(documents.length / options.batchSize);

    logger.info('[Migration] Starting migration', {
        totalDocuments: documents.length,
        batchSize: options.batchSize,
        batches,
        dryRun: options.dryRun,
    });

    for (let i = 0; i < batches; i++) {
        const start = i * options.batchSize;
        const end = Math.min((i + 1) * options.batchSize, documents.length);
        const batch = documents.slice(start, end);

        logger.info(`[Migration] Processing batch ${i + 1}/${batches}`, {
            documentsInBatch: batch.length,
        });

        for (const doc of batch) {
            try {
                if (options.dryRun) {
                    logger.debug('[Migration] [DRY RUN] Would migrate document', {
                        id: doc.id,
                        textLength: doc.text?.length || 0,
                        vectorDims: doc.vector?.length || 0,
                    });
                    stats.migratedDocuments++;
                    continue;
                }

                // Check if document already exists
                const existing = await prisma.document.findUnique({
                    where: { id: doc.id },
                });

                if (existing) {
                    logger.debug('[Migration] Document already exists, skipping', { id: doc.id });
                    stats.skippedDocuments++;
                    continue;
                }

                // Insert into pgvector via Prisma
                await prisma.document.create({
                    data: {
                        id: doc.id,
                        content: doc.text || '',
                        userId: doc.userId,
                        metadata: doc.metadata || {},
                        textEmbedding: doc.vector, // pgvector column
                        createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                    },
                });

                stats.migratedDocuments++;
            } catch (error) {
                logger.error('[Migration] Failed to migrate document', error as Error, {
                    id: doc.id,
                });
                stats.failedDocuments++;
                stats.errors.push({
                    id: doc.id,
                    error: (error as Error).message,
                });
            }
        }

        // Progress update
        const progress = ((end / documents.length) * 100).toFixed(1);
        logger.info(`[Migration] Progress: ${progress}%`, {
            migrated: stats.migratedDocuments,
            failed: stats.failedDocuments,
            skipped: stats.skippedDocuments,
        });
    }

    stats.endTime = Date.now();
    return stats;
}

/**
 * Verify migration by comparing document counts
 */
async function verifyMigration(expectedCount: number): Promise<boolean> {
    try {
        const pgvectorCount = await prisma.document.count();
        
        logger.info('[Migration] Verification results', {
            lanceDBDocuments: expectedCount,
            pgvectorDocuments: pgvectorCount,
            match: pgvectorCount === expectedCount,
        });

        if (pgvectorCount !== expectedCount) {
            logger.warn('[Migration] Document count mismatch', {
                expected: expectedCount,
                actual: pgvectorCount,
                difference: expectedCount - pgvectorCount,
            });
            return false;
        }

        // Test a random sample to verify data integrity
        const sampleSize = Math.min(10, pgvectorCount);
        const samples = await prisma.document.findMany({
            take: sampleSize,
            select: {
                id: true,
                content: true,
                textEmbedding: true,
            },
        });

        let validSamples = 0;
        for (const sample of samples) {
            if (sample.content && sample.textEmbedding && sample.textEmbedding.length > 0) {
                validSamples++;
            }
        }

        logger.info('[Migration] Sample verification', {
            sampleSize,
            validSamples,
            validationRate: `${((validSamples / sampleSize) * 100).toFixed(1)}%`,
        });

        return validSamples === sampleSize;
    } catch (error) {
        logger.error('[Migration] Verification failed', error as Error);
        return false;
    }
}

/**
 * Main migration function
 */
async function main() {
    const options = parseArguments();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   LanceDB → pgvector Migration Script         ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    logger.info('[Migration] Starting migration process', { options });

    try {
        // Step 1: Fetch documents from LanceDB
        console.log('📦 Fetching documents from LanceDB...\n');
        const documents = await fetchLanceDBDocuments();

        if (documents.length === 0) {
            logger.warn('[Migration] No documents found in LanceDB');
            console.log('\n⚠️  No documents to migrate.\n');
            return;
        }

        console.log(`✓ Found ${documents.length} documents in LanceDB\n`);

        // Step 2: Clear target database if requested
        if (options.clearTarget) {
            console.log('🗑️  Clearing target pgvector database...\n');
            const deleted = await clearPgvector();
            console.log(`✓ Cleared ${deleted} existing documents\n`);
        }

        // Step 3: Migrate documents
        console.log('🚀 Starting migration...\n');
        const stats = await migrateBatch(documents, options);

        // Step 4: Display results
        const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
        const successRate = ((stats.migratedDocuments / stats.totalDocuments) * 100).toFixed(1);

        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║           Migration Complete                   ║');
        console.log('╚════════════════════════════════════════════════╝\n');
        console.log(`Total Documents:     ${stats.totalDocuments}`);
        console.log(`Migrated:            ${stats.migratedDocuments} ✓`);
        console.log(`Failed:              ${stats.failedDocuments} ✗`);
        console.log(`Skipped:             ${stats.skippedDocuments} ⊘`);
        console.log(`Success Rate:        ${successRate}%`);
        console.log(`Duration:            ${duration}s`);
        console.log(`Dry Run:             ${options.dryRun ? 'Yes' : 'No'}\n`);

        if (stats.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:\n');
            stats.errors.slice(0, 10).forEach((err) => {
                console.log(`  - Document ${err.id}: ${err.error}`);
            });
            if (stats.errors.length > 10) {
                console.log(`  ... and ${stats.errors.length - 10} more errors\n`);
            }
        }

        // Step 5: Verify migration
        if (!options.dryRun && !options.skipVerification) {
            console.log('🔍 Verifying migration...\n');
            const verified = await verifyMigration(stats.totalDocuments);
            if (verified) {
                console.log('✓ Verification passed\n');
            } else {
                console.log('✗ Verification failed - please check logs\n');
            }
        }

        // Step 6: Next steps
        if (!options.dryRun) {
            console.log('\n📋 Next Steps:\n');
            console.log('  1. Update VECTOR_DB_PROVIDER=pgvector in .env');
            console.log('  2. Restart your application');
            console.log('  3. Test RAG functionality');
            console.log('  4. Backup LanceDB data before deletion\n');
        } else {
            console.log('\n💡 This was a dry run. To perform actual migration:\n');
            console.log('  node scripts/migrate-lancedb-to-pgvector.js\n');
        }
    } catch (error) {
        logger.error('[Migration] Migration failed', error as Error);
        console.error('\n✗ Migration failed:', (error as Error).message, '\n');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
main();
