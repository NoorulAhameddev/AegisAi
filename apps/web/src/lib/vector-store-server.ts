// Server-only wrapper for vector store operations
// This file is only meant to be used on the server side
import path from "path";
import fs from "fs";
import { logger } from "@/lib/logger";

const DB_DIR = path.join(process.cwd(), "data", "lancedb");

// Lazy load to prevent bundling issues
let lancedbInstance: any = null;

async function getLanceDBModule() {
  if (!lancedbInstance) {
    try {
      // Use dynamic require to avoid bundling
      lancedbInstance = await (async () => {
        return await import("@lancedb/lancedb");
      })();
    } catch (error) {
      logger.error("Failed to load LanceDB:", error);
      throw error;
    }
  }
  return lancedbInstance;
}

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export async function getDb() {
  const lancedb = await getLanceDBModule();
  return await lancedb.connect(DB_DIR);
}

export { DB_DIR };
