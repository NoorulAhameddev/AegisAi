/**
 * Centralized Ingestion Service
 * Handles all document ingestion with unified pipeline
 */

import { prisma } from "@/lib/prisma";
import {
  extractText,
  detectLanguage,
  extractMetadata,
} from "../files/fileProcessor";
import { ingestDocument } from "@/ai/rag/vector-store";
import { getEncryptionKey } from "@/lib/secrets";
import { logger } from "@/lib/logger";
import fs from "fs";
import crypto from "crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import path from "path";
import OpenAI from "openai";

export interface IngestionResult {
  fileId: string;
  ragIngested: boolean;
  ragChunks: number;
  language?: string;
  metadata?: any;
}

export interface IngestionOptions {
  userId: string;
  projectId?: string;
  tags?: string[];
  enableRAG?: boolean;
  encryptStorage?: boolean;
}

/**
 * Ingest a single file
 */
export async function ingestFile(
  file: File | { name: string; type: string; buffer: Buffer },
  options: IngestionOptions,
): Promise<IngestionResult> {
  const {
    userId,
    projectId,
    tags = [],
    enableRAG = true,
    encryptStorage = true,
  } = options;

  // Prepare file storage
  const uniqueId = crypto.randomUUID();
  const extension = file.name.split(".").pop();
  const safeName = `${uniqueId}.${extension}`;

  let filePath: string;
  let encryptedPath: string | undefined;

  // Get file buffer
  const buffer =
    "buffer" in file ? file.buffer : Buffer.from(await file.arrayBuffer());

  // Save a temporary plain file for extraction
  const tempPath = `uploads/tmp/${safeName}`;
  ensureDir(path.dirname(tempPath));
  fs.writeFileSync(tempPath, buffer);

  // Save file with encryption
  if (encryptStorage) {
    // Encrypt file content before storage
    const encrypted = await encryptFileBuffer(buffer);
    encryptedPath = `uploads/encrypted/${safeName}`;
    ensureDir(path.dirname(encryptedPath));
    fs.writeFileSync(encryptedPath, encrypted);
    filePath = encryptedPath; // Use encrypted path
  } else {
    filePath = `uploads/${safeName}`;
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);
  }

  // Extract text content from the temporary plain file
  let text = "";
  let language = "en";
  let fileMetadata: any = {};

  try {
    text = await extractText(tempPath, file.type);
    language = detectLanguage(text);
    fileMetadata = await extractMetadata(tempPath, file.type);
  } catch (e: any) {
    logger.error(`[Ingestion] Extraction failed for ${file.name}:`, e);
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // ignore temp cleanup errors
    }
  }

  // Save to database
  const saved = await prisma.file.create({
    data: {
      userId,
      projectId,
      name: file.name,
      type: file.type,
      content: text,
      path: filePath,
      // encryptedPath removed - redundant when path already points to encrypted file
      size: buffer.length,
      tags,
      metadata: {
        ...fileMetadata,
        language,
        ingestionDate: new Date().toISOString(),
      },
    },
  });

  // RAG Ingestion
  let ragIngested = false;
  let ragChunks = 0;

  if (enableRAG && text && text.length > 50) {
    try {
      const documentIds = await ingestDocument(
        text,
        {
          fileId: saved.id,
          fileName: file.name,
          fileType: file.type,
          sourceId: saved.id,
          projectId: projectId,
          type: "file",
          language,
        },
        userId,
      );

      ragIngested = true;
      ragChunks = documentIds.length;

      // Update file with RAG metadata
      await prisma.file.update({
        where: { id: saved.id },
        data: {
          metadata: {
            ...fileMetadata,
            language,
            ragIngested: true,
            ragChunks: documentIds.length,
            ingestedAt: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      logger.error(`[Ingestion] RAG failed for ${file.name}:`, err);
    }
  }

  return {
    fileId: saved.id,
    ragIngested,
    ragChunks,
    language,
    metadata: fileMetadata,
  };
}

/**
 * Batch ingest multiple files
 */
export async function batchIngestFiles(
  files: Array<File | { name: string; type: string; buffer: Buffer }>,
  options: IngestionOptions,
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  for (const file of files) {
    try {
      const result = await ingestFile(file, options);
      results.push(result);
    } catch (err) {
      logger.error(`[Ingestion] Failed to ingest ${file.name}:`, err);
      results.push({
        fileId: "",
        ragIngested: false,
        ragChunks: 0,
        metadata: { error: String(err) },
      });
    }
  }

  return results;
}

/**
 * Ingest from YouTube URL
 */
export async function ingestYouTubeURL(
  url: string,
  options: IngestionOptions,
): Promise<IngestionResult> {
  const { userId, projectId, tags = [], enableRAG = true } = options;

  // Extract video ID
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // Fetch transcript using YouTube Transcript API
  const transcript = await fetchYouTubeTranscript(videoId);
  const title = await fetchYouTubeTitle(videoId);

  // Save as file record
  const saved = await prisma.file.create({
    data: {
      userId,
      projectId,
      name: `${title}.txt`,
      type: "text/plain",
      content: transcript,
      path: `youtube/${videoId}`,
      size: transcript.length,
      tags: [...tags, "youtube"],
      metadata: {
        source: "youtube",
        videoId,
        url,
        language: detectLanguage(transcript),
        ingestionDate: new Date().toISOString(),
      },
    },
  });

  // RAG ingestion
  let ragIngested = false;
  let ragChunks = 0;

  if (enableRAG && transcript.length > 50) {
    try {
      const documentIds = await ingestDocument(
        transcript,
        {
          fileId: saved.id,
          fileName: title,
          fileType: "text/plain",
          sourceId: saved.id,
          projectId,
          type: "youtube",
        },
        userId,
      );

      ragIngested = true;
      ragChunks = documentIds.length;
    } catch (err) {
      logger.error(`[Ingestion] RAG failed for YouTube:`, err);
    }
  }

  return {
    fileId: saved.id,
    ragIngested,
    ragChunks,
    metadata: { videoId, url },
  };
}

/**
 * Ingest from web page URL
 */
export async function ingestWebPageURL(
  url: string,
  options: IngestionOptions,
): Promise<IngestionResult> {
  const { userId, projectId, tags = [], enableRAG = true } = options;

  // Fetch and clean HTML
  const { title, content } = await fetchAndCleanWebPage(url);

  // Save as file record
  const saved = await prisma.file.create({
    data: {
      userId,
      projectId,
      name: `${title}.txt`,
      type: "text/html",
      content,
      path: `webpage/${crypto.randomUUID()}`,
      size: content.length,
      tags: [...tags, "webpage"],
      metadata: {
        source: "webpage",
        url,
        language: detectLanguage(content),
        ingestionDate: new Date().toISOString(),
      },
    },
  });

  // RAG ingestion
  let ragIngested = false;
  let ragChunks = 0;

  if (enableRAG && content.length > 50) {
    try {
      const documentIds = await ingestDocument(
        content,
        {
          fileId: saved.id,
          fileName: title,
          fileType: "text/html",
          sourceId: saved.id,
          projectId,
          type: "webpage",
        },
        userId,
      );

      ragIngested = true;
      ragChunks = documentIds.length;
    } catch (err) {
      logger.error(`[Ingestion] RAG failed for webpage:`, err);
    }
  }

  return {
    fileId: saved.id,
    ragIngested,
    ragChunks,
    metadata: { url },
  };
}

/**
 * Ingest audio file with transcription
 */
export async function ingestAudioFile(
  file: File | { name: string; type: string; buffer: Buffer },
  options: IngestionOptions,
): Promise<IngestionResult> {
  const { userId, projectId, tags = [], enableRAG = true } = options;

  // Save audio file temporarily
  const uniqueId = crypto.randomUUID();
  const extension = file.name.split(".").pop();
  const tempPath = `uploads/temp/${uniqueId}.${extension}`;
  ensureDir(path.dirname(tempPath));

  const buffer =
    "buffer" in file ? file.buffer : Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);

  // Transcribe using OpenAI Whisper
  const transcript = await transcribeAudio(tempPath);

  // Clean up temp file
  fs.unlinkSync(tempPath);

  // Save transcription
  const saved = await prisma.file.create({
    data: {
      userId,
      projectId,
      name: `${file.name}.txt`,
      type: "text/plain",
      content: transcript,
      path: `audio/${uniqueId}`,
      size: transcript.length,
      tags: [...tags, "audio-transcript"],
      metadata: {
        source: "audio",
        originalFileName: file.name,
        originalType: file.type,
        language: detectLanguage(transcript),
        ingestionDate: new Date().toISOString(),
      },
    },
  });

  // RAG ingestion
  let ragIngested = false;
  let ragChunks = 0;

  if (enableRAG && transcript.length > 50) {
    try {
      const documentIds = await ingestDocument(
        transcript,
        {
          fileId: saved.id,
          fileName: file.name,
          fileType: "text/plain",
          sourceId: saved.id,
          projectId,
          type: "audio-transcript",
        },
        userId,
      );

      ragIngested = true;
      ragChunks = documentIds.length;
    } catch (err) {
      logger.error(`[Ingestion] RAG failed for audio:`, err);
    }
  }

  return {
    fileId: saved.id,
    ragIngested,
    ragChunks,
    metadata: { originalFileName: file.name },
  };
}

// Helper functions

async function encryptFileBuffer(buffer: Buffer): Promise<Buffer> {
  const algorithm = "aes-256-gcm";
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Prepend IV and auth tag to encrypted data
  return Buffer.concat([iv, authTag, encrypted]);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Use youtube-transcript library
  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map((item) => item.text).join(" ");
  } catch (err) {
    throw new Error(`Failed to fetch YouTube transcript: ${err}`);
  }
}

export async function fetchYouTubeTitle(videoId: string): Promise<string> {
  // Simple approach: fetch oEmbed data
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    const data = await response.json();
    return data.title || `YouTube Video ${videoId}`;
  } catch {
    return `YouTube Video ${videoId}`;
  }
}

const MAX_WEBPAGE_BYTES = 2 * 1024 * 1024;
const MAX_WEBPAGE_REDIRECTS = 3;

function isPublicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((n) => n < 0 || n > 255)) return false;
    const [a, b, c] = octets;
    // Reject private, loopback, link-local, shared, documentation, benchmark,
    // multicast, and reserved IPv4 ranges.
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) return false;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    if (a === 255 && b === 255 && c === 255) return false;
    return true;
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    // Permit global-unicast IPv6 only. Reject mapped addresses, loopback,
    // unspecified, ULA, link-local, multicast, and special-use/documentation blocks.
    if (normalized.startsWith("::ffff:")) return false;
    if (!(normalized.startsWith("2") || normalized.startsWith("3"))) return false;
    if (
      normalized.startsWith("2001:db8:") ||
      normalized.startsWith("2001:0:") ||
      normalized.startsWith("2001:10:") ||
      normalized.startsWith("2001:20:")
    ) return false;
    return true;
  }

  return false;
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: number }> {
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true });

  // Reject the whole hostname if any DNS answer is non-public. Pin the
  // selected public answer into the HTTP agent to prevent a second DNS lookup.
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("Webpage URL resolves to a non-public or unsupported IP address");
  }
  return addresses[0];
}

async function fetchAndCleanWebPage(
  inputUrl: string,
): Promise<{ title: string; content: string }> {
  const axios = (await import("axios")).default;
  const cheerio = await import("cheerio");
  let currentUrl: URL;

  try {
    currentUrl = new URL(inputUrl);
  } catch {
    throw new Error("Invalid webpage URL");
  }

  for (let redirect = 0; redirect <= MAX_WEBPAGE_REDIRECTS; redirect += 1) {
    if (
      !["http:", "https:"].includes(currentUrl.protocol) ||
      currentUrl.username ||
      currentUrl.password ||
      !currentUrl.hostname ||
      ![80, 443].includes(Number(currentUrl.port || (currentUrl.protocol === "https:" ? 443 : 80)))
    ) {
      throw new Error("Only public HTTP/HTTPS webpage URLs on standard ports are allowed");
    }

    const hostname = currentUrl.hostname.replace(/^\[|\]$/g, "");
    const pinned = await resolvePublicAddress(hostname);
    const pinnedLookup = ((_hostname: string, _options: unknown, callback: (...args: any[]) => void) => {
      callback(null, pinned.address, pinned.family);
    }) as any;
    const agent = currentUrl.protocol === "https:"
      ? new https.Agent({ lookup: pinnedLookup })
      : new http.Agent({ lookup: pinnedLookup });

    let response;
    try {
      response = await axios.get(currentUrl.toString(), {
        httpAgent: currentUrl.protocol === "http:" ? agent : undefined,
        httpsAgent: currentUrl.protocol === "https:" ? agent : undefined,
        proxy: false,
        maxRedirects: 0,
        timeout: 10000,
        responseType: "text",
        maxContentLength: MAX_WEBPAGE_BYTES,
        maxBodyLength: MAX_WEBPAGE_BYTES,
        validateStatus: (status: number) => status >= 200 && status < 400,
        headers: {
          "User-Agent": "AegisAI-WebpageIngestion/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "ERR_BAD_RESPONSE") {
        throw new Error("Webpage response exceeded the allowed size or was invalid");
      }
      throw new Error("Unable to fetch webpage");
    } finally {
      agent.destroy();
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location || redirect === MAX_WEBPAGE_REDIRECTS) {
        throw new Error("Webpage redirect limit exceeded or redirect target missing");
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("URL must return an HTML webpage");
    }

    const $ = cheerio.load(String(response.data));
    $("script, style, nav, footer, header, aside, iframe, object, embed").remove();
    const title = $("title").text() || $("h1").first().text() || "Web Page";
    const content = $("body").text().replace(/\s+/g, " ").trim();
    return { title: title.slice(0, 200), content };
  }

  throw new Error("Unable to fetch webpage");
}

async function transcribeAudio(filePath: string): Promise<string> {
  // Whisper is only available on the official OpenAI endpoint; OpenRouter currently returns 405.
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseURL =
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

  if (!apiKey) {
    throw new Error(
      "Audio transcription requires OPENAI_API_KEY; OpenRouter does not support Whisper.",
    );
  }

  if (apiKey.startsWith("sk-or-")) {
    throw new Error(
      "OPENAI_API_KEY points to an OpenRouter key. Whisper requires a direct OpenAI key.",
    );
  }

  const openai = new OpenAI({ apiKey, baseURL });
  const audioFile = fs.createReadStream(filePath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "openai/gpt-4o-mini",
  });

  return transcription.text;
}
