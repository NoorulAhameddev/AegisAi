# 📘 Aegis AI: Developer Documentation

Welcome to the comprehensive technical documentation for **Aegis AI**. This guide covers architecture, installation, configuration, API reference, and troubleshooting.

---

## 🏗️ System Architecture

Aegis AI uses a modern, scalable full-stack architecture designed for performance and reliability.

### High-Level Overview

```mermaid
graph TD
    Client[Next.js Client] -->|HTTP/Stream| Edge[Edge Middleware]
    Edge -->|Verified Request| Server[App Router API]
    
    subgraph "Core Services"
        Server -->|Auth/Data| DB[(PostgreSQL)]
        Server -->|Rate Limit| Cache[(Redis)]
        Server -->|LLM Inference| AI[OpenAI / Custom LLM]
    end
    
    subgraph "Agent Capabilities"
        Server -->|Browse| Web[Web Search Module]
        Server -->|IO| FileSystem[File Processing]
        Server -->|RAG| Memory[Vector/Relational Memory]
    end
```

### Key Components

1.  **Next.js App Router**: Handles routing, server-side rendering (SSR), and API endpoints. We use Server Actions for mutations and Route Handlers for streaming data.
2.  **Edge Middleware**: Validates JWT authentication tokens before they reach the main server logic, ensuring high-speed security checks.
3.  **Prisma ORM**: Provides a type-safe layer over PostgreSQL. We use it for managing Users, Chats, Messages, Files, and System Settings.
4.  **OpenAI Integration**: The `src/lib/openai` module manages connections to GPT-4o. It handles streaming responses directly to the client using `OpenAIStream` and `StreamingTextResponse`.
5.  **Tool Calling Engine**: A custom implementation in the chat API allows the model to "decide" when to use tools (like searching the web or analyzing a file) before responding to the user.

---

## ⚡ Setup & Installation

### Prerequisites
- **Node.js**: v18.17.0+ (LTS recommended)
- **PostgreSQL**: v14+
- **Redis**: (Optional, but recommended for production rate limiting)
- **Git**

### Step-by-Step Guide

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-org/aegis-ai.git
    cd aegis-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. Use the example below:

    ```env
    # --- App Configuration ---
    NODE_ENV="development"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"

    # --- Database ---
    # Format: postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
    DATABASE_URL="postgresql://postgres:password@localhost:5432/aegis_ai"

    # --- Security (JWT) ---
    # Generate these using `openssl rand -hex 32`
    JWT_ACCESS_SECRET="complex_string_for_access_token_signing"
    JWT_REFRESH_SECRET="complex_string_for_refresh_token_signing"

    # --- AI Services ---
    OPENAI_API_KEY="sk-..."
    OPENAI_MODEL="gpt-4o"

    # --- Optional Services ---
    # Redis for Rate Limiting (leave blank to disable or use in-memory fallback)
    REDIS_URL="redis://localhost:6379"
    ```

4.  **Database Migration**
    Apply the Prisma schema to your database:
    ```bash
    npx prisma db push
    ```
    *Note: In production, use `npx prisma migrate deploy` for better safety.*

5.  **Start the Development Server**
    ```bash
    npm run dev
    ```
    The app should now be running at `http://localhost:3000`.

---

## 🔧 Core Features Implementation

### 1. Autonomous Web Search
The system allows the AI to browse the internet for up-to-date information.
- **Location**: `src/lib/search.ts`
- **Mechanism**: The backend uses tool calling. When the AI detects a query requiring external data (e.g., "What is the stock price of Apple?"), it pauses generation, calls the search tool, executes a scrape, injects the results into the context, and resumes generation.

### 2. File Uploads & Multimodal Analysis
- **Location**: `src/app/api/files/upload/route.ts`
- **Mechanism**: Files are uploaded via `FormData`.
    - **Images**: Converted to Base64/DataURL and passed to GPT-4o Vision.
    - **Documents (PDF/Txt)**: Text is extracted using parsers (`pdf-parse`) and injected into the conversation context as "System Context".

### 3. Long-Term Memory
- **Location**: `src/lib/memory.ts`
- **Mechanism**: We store "facts" about the user in the `UserMemory` table. The `MemoryManager` class retrieves relevant facts based on similarity (vector search) or distinct keyword matching before every chat turn.

### 4. Admin Dashboard
- **Location**: `/admin`
- **Features**:
    - **User Management**: Ban/Unban users, view details.
    - **Invites**: Generate invite codes for restricted signup modes.
    - **System Metrics**: Real-time view of token usage, error rates, and active users.

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/api/auth/register` | Create a new user account. |
| `POST` | `/api/auth/login` | Authenticate and receive HttpOnly cookies. |
| `POST` | `/api/auth/refresh` | Rotate access tokens using the refresh token. |
| `POST` | `/api/auth/logout` | Clear auth cookies. |

### Chat
| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/api/chat/stream` | Main endpoint. Sends `messages`, returns streamed SSE response. |
| `GET` | `/api/chat/history` | Retrieve past conversations. |
| `DELETE` | `/api/chat/:id` | Delete a specific conversation. |

### System
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/health` | Check if API and DB are responsive. |
| `GET` | `/api/admin/metrics` | (Admin Only) detailed system stats. |

---

## 🐛 Troubleshooting

### Common Issues

**1. "Prisma Client could not be fully initialized"**
*   **Cause**: You installed dependencies but didn't generate the client.
*   **Fix**: Run `npx prisma generate`.

**2. "Rate Limit Exceeded" during development**
*   **Cause**: You might be testing too fast.
*   **Fix**: Check `src/lib/rate-limit.ts` and increase the limit or comment out the check for `NODE_ENV === 'development'`.

**3. "Stream Error" or "Empty Response"**
*   **Cause**: Commonly due to an invalid `OPENAI_API_KEY` or the key lacking access to GPT-4o.
*   **Fix**: Check server logs (`server_debug.log`) for the exact OpenAI error message.

---

## 🚢 Production Deployment

To deploy to production (e.g., Vercel, Railway, AWS):

1.  **Build**:
    ```bash
    npm run build
    ```
2.  **Start**:
    ```bash
    npm start
    ```
3.  **Environment**: Ensure all `.env` variables are set in your cloud provider's dashboard.
4.  **Database**: Ensure your database is accessible from the cloud environment (whitelist IPs if necessary).

---
*Maintained by the Aegis AI Team.*
