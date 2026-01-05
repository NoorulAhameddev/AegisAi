import * as lancedb from "@lancedb/lancedb";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { generateEmbedding } from "./embeddings";

const DB_DIR = path.join(process.cwd(), "data", "lancedb");

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

export interface Document {
    id: string;
    text: string;
    vector: number[];
    metadata: string; // JSON string
    userId: string;
    createdAt: number;
    [key: string]: unknown; // Index signature for LanceDB
}

// connect function
async function getDb() {
    return await lancedb.connect(DB_DIR);
}

export async function addDocument(text: string, metadata: any, userId: string) {
    const db = await getDb();
    const tableNames = await db.tableNames();

    // Generate Vector
    const vector = await generateEmbedding(text);

    const record: Document = {
        id: crypto.randomUUID(),
        text,
        vector,
        metadata: JSON.stringify(metadata),
        userId,
        createdAt: Date.now()
    };

    let table;
    if (tableNames.includes("documents")) {
        table = await db.openTable("documents");
        await table.add([record]);
    } else {
        // Create table with first record to infer schema
        table = await db.createTable("documents", [record]);
    }

    return record.id;
}

export async function searchSimilar(query: string, userId: string, limit = 5) {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) return [];

    const vector = await generateEmbedding(query);
    const table = await db.openTable("documents");

    // Search
    const results = await table.vectorSearch(vector)
        .filter(`userId = '${userId}'`) // simple filtering
        .limit(limit)
        .toArray();

    return results as Document[];
}
