# 🚀 Storage Adapter Integration Guide

**Last Updated:** February 10, 2026

---

## Overview

The storage adapter abstraction layer allows Aegis AI to support multiple cloud storage backends without code changes.

## Supported Backends

| Backend | Environment | Configuration | Effort |
|---------|-------------|---------------|--------|
| **Local** | Development | `STORAGE_TYPE=local` | ✅ Ready |
| **AWS S3** | Production | `AWS_REGION`, `S3_BUCKET` | ✅ Ready |
| **Azure Blob** | Production | `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY` | ✅ Ready |
| **Google Cloud** | Production | `GCS_BUCKET`, `GCP_PROJECT_ID` | ✅ Ready |

---

## Configuration

### Development (Local Storage)
```env
STORAGE_TYPE=local
STORAGE_PATH=uploads
```

### Production (AWS S3)
```env
STORAGE_TYPE=s3
S3_BUCKET=aegis-ai-files-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Production (Azure)
```env
STORAGE_TYPE=azure
AZURE_STORAGE_ACCOUNT=aegisaistorage
AZURE_STORAGE_KEY=...
```

### Production (Google Cloud)
```env
STORAGE_TYPE=gcs
GCS_BUCKET=aegis-ai-files
GCP_PROJECT_ID=my-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

---

## API Usage

### Upload File
```typescript
import { getStorageAdapter } from '@/lib/storage-adapter';
import { Readable } from 'stream';

const storage = getStorageAdapter();
const fileStream = Readable.from([buffer]);

const result = await storage.upload(fileStream, 'users/123/document.pdf', {
  userId: '123',
  uploadedBy: 'john@example.com'
});

console.log(result);
// {
//   path: 'users/123/document.pdf',
//   url: 'https://bucket.s3.amazonaws.com/users/123/document.pdf',
//   size: 1024000,
//   duration: 245
// }
```

### Download File
```typescript
const { stream, size, mimeType } = await storage.download('users/123/document.pdf');

// Use stream to send to client
response.setHeader('Content-Length', size);
response.setHeader('Content-Type', mimeType);
stream.pipe(response);
```

### Get Public URL
```typescript
const url = storage.getUrl('users/123/document.pdf');
// Local: /files/users/123/document.pdf
// S3: https://bucket.s3.amazonaws.com/users/123/document.pdf
```

### Get Signed URL (Temporary Access)
```typescript
// Temporary access for 1 hour
const signedUrl = await storage.getSignedUrl('users/123/private.pdf', 3600);

// User can access even if bucket is private
// URL expires in 1 hour
fetch(signedUrl).then(r => r.blob());
```

### List Files
```typescript
const files = await storage.list('users/123/');

files.forEach(file => {
  console.log(`${file.path} (${file.size} bytes)`);
});
```

### Delete File
```typescript
await storage.delete('users/123/document.pdf');
```

### Check File Exists
```typescript
const exists = await storage.exists('users/123/document.pdf');
```

---

## Integration Checklist

- [x] Storage adapter abstraction created
- [x] File upload route updated to use adapter
- [ ] File download route updated
- [ ] File deletion updated
- [ ] Admin file management updated
- [ ] Database migration `encryptedPath` field
- [ ] Environment variables documented
- [ ] Existing file migration script
- [ ] Error handling for storage failures
- [ ] Logging for storage operations

---

## Migration from Local to Cloud

### Step 1: Update Environment
```bash
cp .env.local .env.production
# Edit .env.production with S3 credentials
```

### Step 2: Run Migration Script (Optional)
```bash
npx ts-node scripts/migrate-files-to-s3.ts
# Copies existing uploads/ to S3 bucket
```

### Step 3: Deploy
```bash
npm run build
npm run start
```

### Step 4: Verify
```bash
curl http://localhost:3000/api/health
# Check storage type in logs

# Test upload
curl -F "file=@test.pdf" http://localhost:3000/api/files/upload
```

---

## Example Migration Script

```typescript
// scripts/migrate-files-to-s3.ts
import { getStorageAdapter } from '@/lib/storage-adapter';
import { promises as fs } from 'fs';
import { Readable } from 'stream';

async function migrateLocalToCloud() {
  const local = new LocalStorageAdapter('uploads');
  const cloud = getStorageAdapter();

  if (cloud.type === 'local') {
    console.log('Already using local storage. Skipping migration.');
    return;
  }

  const files = await local.list();
  let migrated = 0;

  for (const file of files) {
    try {
      const { stream } = await local.download(file.path);
      await cloud.upload(stream, file.path, file.metadata);
      migrated++;
      console.log(`✓ Migrated: ${file.path}`);
    } catch (error) {
      console.error(`✗ Failed: ${file.path}`, error);
    }
  }

  console.log(`\nMigration complete: ${migrated}/${files.length} files`);
}

migrateLocalToCloud();
```

---

## Troubleshooting

### Local Development Issues

**Problem:** Files not saving to `uploads/` folder
```bash
# Solution: Ensure uploads directory exists
mkdir -p uploads
chmod 755 uploads
```

**Problem:** "STORAGE_TYPE environment variable not set"
```bash
# Solution: Set in .env.local
echo "STORAGE_TYPE=local" >> .env.local
```

### AWS S3 Issues

**Problem:** "NoCredentialsError: Missing credentials in config"
```bash
# Solution: Set AWS credentials
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
# Or use IAM role on EC2/Lambda
```

**Problem:** "AccessDenied" error
```bash
# Solution: Check S3 bucket permissions
aws s3api get-bucket-policy --bucket aegis-ai-files
# Ensure IAM user has s3:* permissions
```

### Azure Issues

**Problem:** "Authorization header value is not valid"
```bash
# Solution: Verify storage key
az storage account keys list --name aegisaistorage
# Update AZURE_STORAGE_KEY in .env
```

### GCS Issues

**Problem:** "Could not load the default credentials"
```bash
# Solution: Set service account
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
gcloud auth application-default login
```

---

## Performance Considerations

### Optimization Tips

1. **Enable CDN for cloudStorage**
   - S3: CloudFront distribution
   - Azure: enable CDN endpoint
   - GCS: enable Cloud CDN

2. **Use multipart uploads for large files**
   - Automatically handled for files > 100MB
   - Can be configured per backend

3. **Enable compression**
   - Gzip text files before upload
   - Reduces bandwidth by 70%+

4. **Caching**
   - Set Cache-Control headers in metadata
   - Use signed URLs for temporary access

---

## Security Considerations

### File Upload Security

1. **Magic byte validation** ✅
   - Prevents file type spoofing
   - Checks actual file content

2. **Extension whitelisting** ✅
   - Only safe types allowed
   - Prevents .php, .exe, etc.

3. **Size limits** ✅
   - Configurable per environment
   - Prevents OOM attacks

4. **Path normalization** ✅
   - Prevents directory traversal
   - Uses UUID for safe names

### Access Control

1. **User isolation**
   - Files stored in `users/{userId}/` path
   - Database enforces ownership

2. **Encryption**
   - File paths encrypted in DB
   - Cross-cloud secret management

3. **Signed URLs**
   - Temporary access tokens
   - Expiration-based revocation
   - Works with all backends

---

## Monitoring & Logging

All storage operations are logged:

```typescript
// Upload logged as:
logger.info('File uploaded to storage', {
  storagePath: 'uploads/user123/doc.pdf',
  provider: 's3',  // or 'azure', 'gcs', 'local'
  url: 'https://...',
  duration: 245    // milliseconds
});

// View storage metrics:
GET /api/admin/analytics/storage
// Returns per-backend statistics
```

---

## Cost Estimation (Monthly)

| Storage | Volume | Cost | Notes |
|---------|--------|------|-------|
| S3 Standard | 100GB | $2.30 | 1000 users × 100MB avg |
| S3 Glacier | 100GB | $0.40 | Archive tier |
| Azure | 100GB | $2.05 | Similar to S3 |
| GCS | 100GB | $2.00 | Slightly cheaper |

**Recommendation:** Use S3 for < 1TB, consider Glacier for archive

---

## Related Documentation

- [Storage Adapter Code](../src/lib/storage-adapter.ts)
- [File Upload Route](../src/app/api/files/upload/route.ts)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)
- [Azure Blob Docs](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [GCS Docs](https://cloud.google.com/storage/docs)

---

**Ready to deploy with cloud storage?** Contact DevOps team for credential setup.
