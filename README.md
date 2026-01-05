# 🛡️ Aegis AI

![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

> **The Enterprise-Grade AI Chat Platform.**  
> Built for performance, security, and scalability with Next.js 15 (App Router), Prisma, and OpenAI.

---

## 🚀 Overview

**Aegis AI** is a fully production-ready AI chat application that goes beyond simple wrappers. It implements a robust, secure, and scalable architecture designed for real-world usage. 

Unlike basic tutorials, Aegis features **autonomous web search capabilities**, **long-term conversation memory**, **multimodal file analysis**, and a **secure authentication system** built from scratch. It is designed to be the perfect starting point for your own internal AI tools or SaaS products.

---

## ✨ Key Features

### 🧠 **Intelligent AI Core**
- **GPT-4o Integration**: Utilizes the latest models for high-fidelity responses.
- **Real-Time Streaming**: Zero-latency token streaming using the Edge Runtime.
- **Autonomous Web Search**: The AI can browse the web to fetch real-time information using custom tool calling functions.
- **Contextual Memory**: Remembers previous conversations and user context indefinitely.

### 🛡️ **Enterprise Security**
- **Bank-Grade Auth**: Custom JWT implementation with HTTP-only cookies (Access + Refresh tokens).
- **Rate Limiting**: Redis-backed sliding window rate limiting to prevent abuse.
- **Role-Based Access**: Granular permissions system (User/Admin roles) with protected API routes.

### 📎 **Multimodal Capabilities**
- **File Analysis**: Upload documents or images for the AI to analyze.
- **Image Vision**: distinct support for analyzing images via GPT-4o Vision.
- **Smart Formatting**: Full Markdown support including tables, code blocks, and LaTeX math equations.

### ⚙️ **Admin & Operations**
- **Admin Dashboard**: Comprehensive panel to manage users, view usage metrics, and control system access.
- **Maintenance Mode**: One-click system lockdown for updates.
- **Usage Tracking**: Per-user token usage tracking for billing or quotas.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Framework** | Next.js 15 (App Router) | React Server Components, Server Actions |
| **Language** | TypeScript | Strict type safety across the entire stack |
| **Database** | PostgreSQL | Robust relational data storage |
| **ORM** | Prisma | Type-safe database queries and migrations |
| **Styling** | Tailwind CSS 4 | Utility-first styling with modern design system |
| **AI Processing** | OpenAI SDK | Chat completions and Tool calling |
| **Search** | GoogleThis / Cheerio | Web scraping and search aggregation |
| **Latency Control** | Redis | Rate limiting and caching |
| **Container** | Docker | Easy deployment and orchestration |

---

## 🚦 Getting Started

Follow these steps to set up Aegis AI locally.

### Prerequisites
- Node.js 18+  
- Docker (for local PostgreSQL/Redis) OR a hosted database URL

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/aegis-ai.git
cd aegis-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```bash
# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/aegis_db"

# Security
JWT_ACCESS_SECRET="your-super-secret-access-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# OpenAI
OPENAI_API_KEY="sk-..."

# Redis (Optional, for Rate Limiting)
REDIS_URL="redis://localhost:6379"
```

### 4. Database Setup
Push the schema to your database:
```bash
npx prisma db push
```

### 5. Run the Application
```bash
npm run dev
```
Visit `http://localhost:3000` to start chatting!

---

## 📁 Project Structure

```bash
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Core logic (Auth, OpenAI, Prisma, Utils)
│   └── middleware.ts        # Edge middleware for Auth & Security
├── prisma/                  # Database schema & migrations
├── public/                  # Static assets
└── scripts/                 # Maintenance & utility scripts
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ by [Noorul Ahemed]*
