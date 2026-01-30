# Aegis AI Study Hub - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Migrations](#database-migrations)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### For Local Development
- Node.js 20+ (LTS)
- PostgreSQL 14+
- Redis 7+
- npm or yarn package manager

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 2GB free disk space (more for uploads)

## Local Development Setup

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd aegis-ai
npm install --legacy-peer-deps
```

### 2. Setup Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all required values:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` - Generate: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate: `openssl rand -base64 32`
- `ENCRYPTION_KEY` - Generate: `openssl rand -hex 16`
- `OPENROUTER_API_KEY` - Get from https://openrouter.ai/keys

### 3. Setup PostgreSQL Database
```bash
# Create database
createdb aegis_ai

# Run migrations
npm run migrate

# Optional: Open Prisma Studio
npm run studio
```

### 4. Setup Redis
```bash
# On macOS with Homebrew
brew services start redis

# On Linux/Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Start Development Servers

Terminal 1 - Start Next.js dev server:
```bash
npm run dev
```

Terminal 2 - Start AI worker (required for chat):
```bash
npm run worker
```

Access the application at `http://localhost:3000`

## Docker Deployment

### 1. Prepare Environment File
```bash
cp .env.example .env.docker
```

Edit `.env.docker` with production values. At minimum set:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `OPENROUTER_API_KEY`
- `DB_PASSWORD` (secure password)
- `SITE_URL` (your domain)

### 2. Build and Start Containers
```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 3. Run Migrations
```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed  # Optional
```

### 4. Verify Services
```bash
# Check all services are running
docker-compose ps

# Test API endpoint
curl http://localhost:3000/api/ping

# Test database connection
docker-compose exec postgres psql -U postgres -d aegis_ai -c "SELECT COUNT(*) FROM \"User\";"

# Test Redis connection
docker-compose exec redis redis-cli ping
```

## Production Deployment

### Option 1: Vercel/Netlify (Recommended for Next.js)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Import project from GitHub
   - Set environment variables (copy from `.env.example`)
   - Deploy

3. **Setup Database** (Use external PostgreSQL)
   - Use Vercel Postgres or managed service (Railway, Heroku, etc.)
   - Update `DATABASE_URL` in Vercel environment variables

4. **Setup Redis** (Use external Redis)
   - Use Redis Cloud, Upstash, or similar
   - Update `REDIS_URL` in Vercel environment variables

### Option 2: Self-Hosted Docker (VPS/Cloud Server)

#### On Your Server:

1. **Install Docker & Docker Compose**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt-get install -y docker-compose
   ```

2. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd aegis-ai
   ```

3. **Setup Environment**
   ```bash
   nano .env.docker  # Edit with production values
   ```

4. **Start Application**
   ```bash
   docker-compose up -d
   
   # Verify
   docker-compose logs -f app
   ```

5. **Setup SSL Certificate** (Let's Encrypt)
   ```bash
   docker-compose run --rm certbot certonly --standalone -d yourdomain.com
   ```

6. **Configure Nginx Reverse Proxy** (Optional but recommended)
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 3: Kubernetes (Enterprise)

Use provided Helm chart or create ConfigMaps:

```bash
# Create namespace
kubectl create namespace aegis

# Create secrets
kubectl create secret generic aegis-secrets \
  --from-literal=DATABASE_URL="..." \
  --from-literal=REDIS_URL="..." \
  --from-literal=JWT_ACCESS_SECRET="..." \
  -n aegis

# Deploy using Helm or kubectl
kubectl apply -f k8s/deployment.yaml -n aegis
```

## Environment Configuration

### Required Variables
```
DATABASE_URL          # PostgreSQL connection string
REDIS_URL            # Redis connection string
JWT_ACCESS_SECRET    # 32+ character random string
JWT_REFRESH_SECRET   # 32+ character random string
ENCRYPTION_KEY       # 32 character hex string (openssl rand -hex 16)
OPENROUTER_API_KEY   # From https://openrouter.ai/keys
NODE_ENV             # 'production' for deployments
SITE_URL             # Your application URL
```

### Optional but Recommended
```
MAX_FILE_SIZE        # Maximum upload size (default: 50MB)
RAG_CHUNK_SIZE       # Document chunk size (default: 1000)
MAX_TOKENS           # LLM max tokens (default: 2000)
LOG_LEVEL            # 'info', 'warn', 'error', 'debug'
```

### Feature Flags
```
ENABLE_RAG=true              # Semantic search
ENABLE_ENCRYPTION=true       # File encryption
ENABLE_FILE_UPLOAD=true      # File uploads
ENABLE_YOUTUBE_INGESTION=true
ENABLE_WEB_SCRAPING=true
ENABLE_AUDIO_TRANSCRIPTION=true
ENABLE_IMAGE_OCR=true
```

## Database Migrations

### Create New Migration
```bash
npm run prisma migrate dev --name migration_name
```

### Deploy Migrations
```bash
# Development
npm run migrate

# Docker
docker-compose exec app npx prisma migrate deploy

# Kubernetes
kubectl exec -it deployment/aegis-app npx prisma migrate deploy -n aegis
```

### Rollback Migration (if needed)
```bash
npm run prisma migrate resolve --rolled-back migration_name
```

## Troubleshooting

### Issue: "Connection refused" on DATABASE_URL
**Solution:**
- Verify PostgreSQL is running
- Check credentials and port
- Ensure database exists: `createdb aegis_ai`
- Test connection: `psql -U postgres -d aegis_ai`

### Issue: "Redis connection timeout"
**Solution:**
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL is correct
- Ensure port 6379 is not blocked by firewall

### Issue: "JWT_ACCESS_SECRET not configured"
**Solution:**
- Generate: `openssl rand -base64 32`
- Add to .env file
- Restart application

### Issue: "AI Worker not processing messages"
**Solution:**
- Ensure worker is running: `npm run worker`
- Check Redis connection
- Verify OPENROUTER_API_KEY is valid
- Check worker logs for errors

### Issue: "File uploads failing"
**Solution:**
- Verify uploads directory exists and is writable
- Check disk space: `df -h`
- Verify MAX_FILE_SIZE configuration
- Check file permissions: `chmod 755 uploads`

### Issue: "Docker compose up fails"
**Solution:**
- Check Docker daemon: `docker ps`
- Verify ports are available: `lsof -i :3000,5432,6379`
- Check disk space: `df -h`
- Review logs: `docker-compose logs`

### Issue: "Slow database queries"
**Solution:**
- Run migrations to ensure indexes exist
- Check database stats: `npm run studio`
- Verify REDIS_URL is configured for caching
- Monitor disk space

## Monitoring & Maintenance

### Health Checks
```bash
# API health
curl http://localhost:3000/api/ping

# Database
docker-compose exec postgres psql -U postgres -d aegis_ai -c "SELECT 1"

# Redis
docker-compose exec redis redis-cli ping

# Worker
docker-compose logs app | grep "worker"
```

### Backup Database
```bash
# Full backup
docker-compose exec postgres pg_dump -U postgres aegis_ai > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres aegis_ai < backup.sql
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild Docker image
docker-compose build --no-cache

# Restart services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

## Performance Optimization

1. **Database Indexing**: Already configured in schema
2. **Redis Caching**: Configured for sessions and rate limiting
3. **Vector Store**: LanceDB configured for RAG
4. **File Compression**: Enabled for exports
5. **Query Optimization**: Use pagination for large datasets

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS/TLS enabled in production
- [ ] Database password is strong and random
- [ ] JWT secrets are 32+ characters
- [ ] Firewall rules limit access to DB/Redis
- [ ] Regular database backups scheduled
- [ ] Log monitoring enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] File uploads validated and scanned

## Support & Resources

- **Documentation**: See docs/ directory
- **Issue Tracker**: GitHub Issues
- **Community**: Discussions tab
- **API Docs**: http://localhost:3000/api-docs (if Swagger enabled)

## Next Steps

1. Review `.env.example` and create production `.env` file
2. Run database migrations
3. Test all API endpoints
4. Setup monitoring and alerting
5. Configure backups
6. Enable SSL/TLS certificates
7. Setup CI/CD pipeline
8. Monitor application performance

---

For detailed API documentation, see `docs/API.md`
For RAG system details, see `docs/RAG_IMPLEMENTATION.md`
For troubleshooting guide, see `docs/TROUBLESHOOTING.md`
