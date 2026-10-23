/**
 * Storage Adapter Interface
 *
 * Abstract interface for file storage operations
 * Supports multiple backends: Local, S3, Azure, GCS
 *
 * Usage:
 *   const storage = getStorageAdapter()
 *   const url = await storage.upload(fileStream, 'path/to/file.pdf')
 *   const stream = await storage.download('path/to/file.pdf')
 *   await storage.delete('path/to/file.pdf')
 */

import { Stream, Readable } from "stream";

export interface StorageFile {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  duration: number; // milliseconds
}

export interface DownloadResult {
  stream: Stream;
  size: number;
  mimeType: string;
}

export type StorageType = "local" | "s3" | "azure" | "gcs";

/**
 * Abstract storage adapter interface
 */
export abstract class StorageAdapter {
  abstract type: StorageType;
  abstract bucketName: string;

  abstract upload(
    file: Readable,
    path: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult>;

  abstract download(path: string): Promise<DownloadResult>;

  abstract delete(path: string): Promise<void>;

  abstract exists(path: string): Promise<boolean>;

  abstract list(prefix?: string): Promise<StorageFile[]>;

  abstract getUrl(path: string): string;

  abstract getSignedUrl(path: string, expiresIn?: number): Promise<string>;
}

/**
 * Factory function to get configured storage adapter
 */
export function getStorageAdapter(): StorageAdapter {
  const storageType = (process.env.STORAGE_TYPE || "local") as StorageType;

  switch (storageType) {
    case "s3":
      return new S3StorageAdapter(
        process.env.AWS_REGION || "us-east-1",
        process.env.S3_BUCKET || "aegis-ai-files",
      );
    case "azure":
      return new AzureStorageAdapter(
        process.env.AZURE_STORAGE_ACCOUNT || "",
        process.env.AZURE_STORAGE_CONTAINER || "files",
      );
    case "gcs":
      return new GoogleCloudStorageAdapter(
        process.env.GCS_BUCKET || "aegis-ai-files",
        process.env.GCP_PROJECT_ID || "",
      );
    case "local":
    default:
      return new LocalStorageAdapter(process.env.STORAGE_PATH || "uploads");
  }
}

/**
 * Local File System Storage (Development)
 */
export class LocalStorageAdapter extends StorageAdapter {
  type: StorageType = "local";
  bucketName: string;
  private basePath: string;

  constructor(basePath: string = "uploads") {
    super();
    this.basePath = basePath;
    this.bucketName = basePath;
  }

  async upload(
    file: Stream,
    path: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    const { promises: fs } = await import("fs");
    const { createWriteStream } = await import("fs");
    const pathModule = await import("path");

    const startTime = performance.now();
    // SECURITY: Validate path to prevent directory traversal attacks
    const normalizedPath = path.replace(/\.\./g, "");
    const fullPath = `${this.basePath}/${normalizedPath}`;
    const resolvedPath = pathModule.resolve(fullPath);
    const resolvedBase = pathModule.resolve(this.basePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("Invalid path: directory traversal detected");
    }

    // Create directories if needed
    await fs.mkdir(dirname(fullPath), { recursive: true });

    return new Promise((resolve, reject) => {
      let size = 0;
      const writeStream = createWriteStream(fullPath);

      file.on("data", (chunk) => {
        size += chunk.length;
      });

      file.pipe(writeStream);

      writeStream.on("finish", () => {
        const duration = performance.now() - startTime;
        resolve({
          path,
          url: `/files/${path}`,
          size,
          duration,
        });
      });

      writeStream.on("error", reject);
      file.on("error", reject);
    });
  }

  async download(path: string): Promise<DownloadResult> {
    const { createReadStream, statSync } = await import("fs");
    const fullPath = `${this.basePath}/${path}`;

    const stats = statSync(fullPath);
    const stream = createReadStream(fullPath);

    return {
      stream,
      size: stats.size,
      mimeType: getMimeType(path),
    };
  }

  async delete(path: string): Promise<void> {
    const { promises: fs } = await import("fs");
    const fullPath = `${this.basePath}/${path}`;
    await fs.unlink(fullPath);
  }

  async exists(path: string): Promise<boolean> {
    const { promises: fs } = await import("fs");
    try {
      await fs.access(`${this.basePath}/${path}`);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    const { promises: fs } = await import("fs");
    const { join } = await import("path");

    const searchPath = prefix ? `${this.basePath}/${prefix}` : this.basePath;
    const files: StorageFile[] = [];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.replace(this.basePath + "/", "");

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          files.push({
            path: relativePath,
            url: `/files/${relativePath}`,
            size: stats.size,
            mimeType: getMimeType(relativePath),
            uploadedAt: stats.birthtime,
            metadata: {},
          });
        }
      }
    };

    await walk(searchPath);
    return files;
  }

  getUrl(path: string): string {
    return `/files/${path}`;
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    // Local storage doesn't need signed URLs
    return this.getUrl(path);
  }
}

/**
 * AWS S3 Storage
 */
export class S3StorageAdapter extends StorageAdapter {
  type: StorageType = "s3";
  bucketName: string;
  private region: string;
  private s3: any;

  constructor(region: string, bucketName: string) {
    super();
    this.region = region;
    this.bucketName = bucketName;
  }

  private async getS3Client() {
    if (!this.s3) {
      const { S3Client } = await import("@aws-sdk/client-s3");
      this.s3 = new S3Client({ region: this.region });
    }
    return this.s3;
  }

  async upload(
    file: Readable,
    path: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client();

    const startTime = performance.now();

    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    await s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: buffer,
        ContentType: getMimeType(path),
        Metadata: metadata || {},
      }),
    );

    const duration = performance.now() - startTime;

    return {
      path,
      url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${path}`,
      size: buffer.length,
      duration,
    };
  }

  async download(path: string): Promise<DownloadResult> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client();

    const result = await s3.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      }),
    );

    return {
      stream: result.Body as Stream,
      size: result.ContentLength || 0,
      mimeType: result.ContentType || getMimeType(path),
    };
  }

  async delete(path: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      }),
    );
  }

  async exists(path: string): Promise<boolean> {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client();

    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: path,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client();

    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      }),
    );

    return (result.Contents || []).map(
      (obj: { Key?: string; Size?: number; LastModified?: Date }) => ({
        path: obj.Key!,
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${obj.Key}`,
        size: obj.Size || 0,
        mimeType: getMimeType(obj.Key!),
        uploadedAt: obj.LastModified || new Date(),
        metadata: {},
      }),
    );
  }

  getUrl(path: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${path}`;
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client();

    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      }),
      { expiresIn },
    );
  }
}

/**
 * Azure Blob Storage
 */
export class AzureStorageAdapter extends StorageAdapter {
  type: StorageType = "azure";
  bucketName: string;
  private account: string;
  private blobClient: any;

  constructor(account: string, container: string) {
    super();
    this.account = account;
    this.bucketName = container;
  }

  private async getClient() {
    if (!this.blobClient) {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${this.account};AccountKey=${process.env.AZURE_STORAGE_KEY};EndpointSuffix=core.windows.net`;
      const client = BlobServiceClient.fromConnectionString(connectionString);
      this.blobClient = client.getContainerClient(this.bucketName);
    }
    return this.blobClient;
  }

  async upload(
    file: Readable,
    path: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    const startTime = performance.now();
    const client = await this.getClient();

    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const blobClient = client.getBlockBlobClient(path);
    await blobClient.upload(buffer, buffer.length, {
      metadata,
    });

    const duration = performance.now() - startTime;

    return {
      path,
      url: blobClient.url,
      size: buffer.length,
      duration,
    };
  }

  async download(path: string): Promise<DownloadResult> {
    const client = await this.getClient();
    const blobClient = client.getBlockBlobClient(path);
    const downloadResponse = await blobClient.download();

    return {
      stream: downloadResponse.readableStreamBody as Stream,
      size: downloadResponse.contentLength || 0,
      mimeType: downloadResponse.contentType || getMimeType(path),
    };
  }

  async delete(path: string): Promise<void> {
    const client = await this.getClient();
    const blobClient = client.getBlockBlobClient(path);
    await blobClient.delete();
  }

  async exists(path: string): Promise<boolean> {
    const client = await this.getClient();
    const blobClient = client.getBlockBlobClient(path);
    return blobClient.exists();
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    const client = await this.getClient();
    const files: StorageFile[] = [];

    for await (const blob of client.listBlobsFlat({ prefix })) {
      files.push({
        path: blob.name,
        url: `https://${this.account}.blob.core.windows.net/${this.bucketName}/${blob.name}`,
        size: blob.properties.contentLength || 0,
        mimeType: blob.properties.contentType || getMimeType(blob.name),
        uploadedAt: blob.properties.createdOn || new Date(),
        metadata: blob.metadata || {},
      });
    }

    return files;
  }

  getUrl(path: string): string {
    return `https://${this.account}.blob.core.windows.net/${this.bucketName}/${path}`;
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { BlobSASPermissions, generateBlobSASQueryParameters } =
      await import("@azure/storage-blob");
    const { StorageSharedKeyCredential } =
      await import("@azure/storage-common");
    const client = await this.getClient();
    const blobClient = client.getBlockBlobClient(path);

    const accountKey = process.env.AZURE_STORAGE_KEY!;
    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.account,
      accountKey,
    );

    const sasQueryParameters = generateBlobSASQueryParameters(
      {
        containerName: this.bucketName,
        blobName: path,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn: new Date(Date.now() + expiresIn * 1000),
      },
      sharedKeyCredential,
    );

    return `${blobClient.url}?${sasQueryParameters.toString()}`;
  }
}

/**
 * Google Cloud Storage
 */
export class GoogleCloudStorageAdapter extends StorageAdapter {
  type: StorageType = "gcs";
  bucketName: string;
  private projectId: string;
  private storage: any;

  constructor(bucketName: string, projectId: string) {
    super();
    this.bucketName = bucketName;
    this.projectId = projectId;
  }

  private async getStorage() {
    if (!this.storage) {
      const { Storage } = await import("@google-cloud/storage");
      this.storage = new Storage({
        projectId: this.projectId,
      });
    }
    return this.storage;
  }

  async upload(
    file: Readable,
    path: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    const storage = await this.getStorage();
    const startTime = performance.now();

    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const bucket = storage.bucket(this.bucketName);
    const file_obj = bucket.file(path);

    await file_obj.save(buffer, {
      metadata: {
        metadata,
      },
    });

    const duration = performance.now() - startTime;

    return {
      path,
      url: `https://storage.googleapis.com/${this.bucketName}/${path}`,
      size: buffer.length,
      duration,
    };
  }

  async download(path: string): Promise<DownloadResult> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(path);

    const [contents] = await file.download();
    const { Readable } = await import("stream");
    const stream = Readable.from([contents]);

    return {
      stream,
      size: contents.length,
      mimeType: getMimeType(path),
    };
  }

  async delete(path: string): Promise<void> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(path);
    await file.delete();
  }

  async exists(path: string): Promise<boolean> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(path);
    const [exists] = await file.exists();
    return exists;
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix });

    return files.map(
      (file: {
        name: string;
        metadata: {
          size?: number;
          timeCreated?: string;
          metadata?: Record<string, string>;
        };
      }) => ({
        path: file.name,
        url: `https://storage.googleapis.com/${this.bucketName}/${file.name}`,
        size: file.metadata.size || 0,
        mimeType: getMimeType(file.name),
        uploadedAt: new Date(file.metadata.timeCreated || Date.now()),
        metadata: file.metadata.metadata || {},
      }),
    );
  }

  getUrl(path: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${path}`;
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const storage = await this.getStorage();
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(path);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  }
}

/**
 * Helper to detect MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    zip: "application/zip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    webm: "video/webm",
  };

  return mimeTypes[ext!] || "application/octet-stream";
}
