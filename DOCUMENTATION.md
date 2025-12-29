# Project Documentation

## 📖 Overview

This is a production-grade AI chat application built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. It features secure authentication, real-time AI streaming, Redis-backed rate limiting, persistent chat history, AI memory, and a comprehensive admin dashboard.

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: v13 or higher
- **Redis**: v6 or higher (for rate limiting)
- **Docker & Docker Compose**: (Optional, for containerized setup)
- **npm**: Comes with Node.js

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd my-first-project
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory and add the following variables:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Authentication Secrets (Generate random strings for production)
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"

# OpenAI Configuration
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

# Node Environment
NODE_ENV="development"
```

### 3. Database Setup

Initialize the database schema using Prisma:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to the database (for development)
npx prisma db push
```

### 4. Running the Application

Start the development server:

### 5. Docker Setup (Alternative)

If you prefer to use Docker, you can start the entire stack (App, Postgres, Redis) with a single command:

```bash
docker-compose up --build
```

---

## 📂 Project Structure

- **`src/app`**: Next.js App Router pages and API routes.
  - **`/api`**: Backend endpoints (Auth, Chat, Admin, Files, Memory).
  - **`/dashboard`**: User chat dashboard.
  - **`/admin`**: System administration interface.
  - **`/chat/[id]`**: Real-time streaming chat interface.
  - **`/files`**: File upload and management interface.
  - **`/settings`**: User profile and application settings.
- **`src/components`**: Reusable UI components (Buttons, Inputs, Chat Bubbles, Modals).
- **`src/lib`**: Utility libraries.
  - `prisma.ts`: Database client instance.
  - `redis.ts`: Redis client for rate limiting.
  - `auth.ts`: Authentication logic (hashing, JWT).
  - `ai.ts`: OpenAI client and streaming utilities.
  - `memory.ts`: AI context and memory management.
- **`prisma/`**: Database schema definition (`schema.prisma`).
- **`scripts/`**: Automation and maintenance scripts.
- **Root Scripts**: Helper JS tools for quick administration (e.g., `list-users.js`, `promote-admin.js`).

---

## 🔌 API Documentation

### Authentication

#### Register
- **Endpoint**: `POST /api/auth/register`
- **Body**:
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Login
- **Endpoint**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Chat

#### Send Message (Streaming)
- **Endpoint**: `POST /api/chat/stream`
- **Body**:
  ```json
  {
    "messages": [{ "role": "user", "content": "Hello" }],
    "conversationId": "uuid"
  }
  ```

### Conversations

#### List Conversations
- **Endpoint**: `GET /api/conversations`

#### Get Message History
- **Endpoint**: `GET /api/messages?conversationId=...`

### Files

#### Upload File
- **Endpoint**: `POST /api/files/upload`
- **Body**: `FormData` containing the file.

### Admin

#### Get System Metrics
- **Endpoint**: `GET /api/admin/metrics`

---

## 🛠 Scripts

- `npm run dev`: Start development server.

---

## 🛠 Admin Helper Scripts

The project includes several utility scripts in the root directory for quick management:

- `node list-users.js`: Lists all registered users.
- `node promote-admin.js <email>`: Promotes a user to administrator status.
- `node check-metrics.js`: Displays system-wide usage metrics.
- `node check-chats.js`: Lists recent conversation activity.
- `node check-messages.js`: Debug tool for inspecting message flow.
