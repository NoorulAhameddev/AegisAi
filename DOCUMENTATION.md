# Project Documentation

## 📖 Overview

This is a production-grade AI chat application built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. It features secure authentication, real-time AI streaming, persistent chat history, and a responsive UI.

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: A running instance (local or cloud)
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

# Authentication Secrets (Generate random strings for production)
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"

# OpenAI Configuration
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini" # or gpt-3.5-turbo

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

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

- **`src/app`**: Next.js App Router pages and API routes.
  - **`/api`**: Backend endpoints (Auth, Chat).
  - **`/dashboard`**: Protected user area.
  - **`/chat/[id]`**: Individual chat interface.
- **`src/components`**: Reusable UI components (Buttons, Inputs, Chat Bubbles).
- **`src/lib`**: Utility libraries.
  - `prisma.ts`: Database client instance.
  - `auth.ts`: Authentication logic (hashing, JWT).
  - `ai.ts`: OpenAI client configuration.
- **`prisma/`**: Database schema definition (`schema.prisma`).

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

#### Send Message
- **Endpoint**: `POST /api/chat/complete`
- **Body** (Required):
  ```json
  {
    "message": "Hello AI",
    "conversationId": "existing-or-new-uuid"
  }
  ```

---

## 🛠 Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm start`: Start production server.
- `npm run lint`: Run ESLint checks.
