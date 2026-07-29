#!/bin/bash
set -euo pipefail

# Aegis AI Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]
# Deploys the application using Docker Compose with production profile

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/infra/docker/docker-compose.yml"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  log_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
  exit 1
fi

log_info "Deploying Aegis AI to ${ENVIRONMENT}..."

# Step 1: Run linting
log_info "Step 1/5: Running linter..."
cd "$PROJECT_DIR"
npm run lint
log_info "Linting passed"

# Step 2: Run type checking
log_info "Step 2/5: Running type check..."
npx tsc --noEmit
log_info "Type check passed"

# Step 3: Run tests
log_info "Step 3/5: Running tests..."
npm run test:coverage
log_info "Tests passed"

# Step 4: Build the application
log_info "Step 4/5: Building application..."
npm run build:all
log_info "Build completed"

# Step 5: Deploy with Docker Compose
log_info "Step 5/5: Starting Docker Compose (${ENVIRONMENT} profile)..."

# Set environment-specific variables
export DEPLOY_ENV="$ENVIRONMENT"
export COMPOSE_PROFILES="$ENVIRONMENT"

# Load environment file
if [ -f "${PROJECT_DIR}/.env.${ENVIRONMENT}" ]; then
  export $(grep -v '^#' "${PROJECT_DIR}/.env.${ENVIRONMENT}" | xargs)
elif [ -f "${PROJECT_DIR}/.env" ]; then
  export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
fi

cd "${PROJECT_DIR}/infra/docker"

# Pull latest images
docker compose pull --quiet

# Start services with production profile
docker compose --profile "$ENVIRONMENT" up -d --remove-orphans

log_info "Containers started, waiting for health check..."

# Health check
log_info "Running health checks..."
RETRY=0
HEALTHY=false

while [ $RETRY -lt $HEALTH_CHECK_RETRIES ]; do
  RETRY=$((RETRY + 1))
  
  if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  
  log_warn "Health check attempt ${RETRY}/${HEALTH_CHECK_RETRIES} failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
  sleep $HEALTH_CHECK_INTERVAL
done

if [ "$HEALTHY" = true ]; then
  log_info "Deployment successful! Application is healthy at ${HEALTH_CHECK_URL}"
  
  # Show running containers
  echo ""
  log_info "Running containers:"
  docker compose ps
  
  echo ""
  log_info "Deployment summary:"
  log_info "  Environment: ${ENVIRONMENT}"
  log_info "  Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  log_info "  Health: OK"
  
  exit 0
else
  log_error "Health check failed after ${HEALTH_CHECK_RETRIES} attempts"
  log_error "Showing container logs for debugging:"
  docker compose logs --tail=50
  
  # Rollback: stop containers
  log_warn "Rolling back deployment..."
  docker compose --profile "$ENVIRONMENT" down
  
  exit 1
fi
