.PHONY: dev build test lint migrate deploy backup clean help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development server
	npm run dev

dev:all: ## Start development server with workers
	npm run dev & npm run worker & npm run mcp:start

build: ## Build the application
	npm run build:all

test: ## Run tests
	npm test

test:watch: ## Run tests in watch mode
	npm run test:watch

test:coverage: ## Run tests with coverage report
	npm run test:coverage

test:mcp: ## Test MCP server integration
	npm run test:mcp

test:edge: ## Test edge cases
	npm run test:edge

lint: ## Run linter
	npm run lint

lint:fix: ## Run linter with auto-fix
	npm run lint -- --fix

format: ## Format code with Prettier
	npm run format

typecheck: ## Run TypeScript type checking
	npx tsc --noEmit

migrate: ## Run database migrations (development)
	npm run migrate

migrate:deploy: ## Deploy database migrations (production)
	npm run migrate:deploy

migrate:dry: ## Dry run database migrations
	npm run migrate:dry-run

studio: ## Open Prisma Studio
	npm run studio

deploy: ## Deploy to production
	./scripts/deploy.sh production

deploy:staging: ## Deploy to staging
	./scripts/deploy.sh staging

backup: ## Create database backup
	./scripts/backup.sh

docker:build: ## Build Docker image
	npm run docker:build

docker:up: ## Start Docker containers
	npm run docker:up

docker:down: ## Stop Docker containers
	npm run docker:down

clean: ## Clean build artifacts and caches
	npm run clean

install: ## Install dependencies
	npm install

setup: ## Setup local development environment
	npm run setup

worker: ## Start AI worker
	npm run worker

worker:rag: ## Start RAG worker
	npm run worker:rag

worker:websocket: ## Start WebSocket worker
	npm run worker:websocket

worker:video: ## Start video summary worker
	npm run worker:video-summary

cleanup: ## Clean up stale sessions
	npm run cleanup:sessions
